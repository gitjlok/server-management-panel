#!/bin/bash
# 服务器管理面板一键安装脚本
# 使用方法: if [ -f /usr/bin/curl ];then curl -sSO https://raw.githubusercontent.com/gitjlok/server-management-panel/main/install.sh;else wget -O install.sh https://raw.githubusercontent.com/gitjlok/server-management-panel/main/install.sh;fi;bash install.sh

PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/bin
export PATH

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PLAIN='\033[0m'

# 记录开始时间
start_time=$(date +%s)

# 打印欢迎信息
echo -e "=================================================================="
echo -e "\033[32m服务器管理面板 Linux面板安装脚本\033[0m"
echo -e "=================================================================="
echo -e ""
echo -e "官方网站: https://github.com/gitjlok/server-management-panel"
echo -e ""
echo -e "安装过程中如遇到问题，请访问GitHub Issues反馈"
echo -e ""
echo -e "=================================================================="
echo ""

# 检查root权限
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}错误: 请使用root权限运行此脚本${PLAIN}"
    exit 1
fi

# 检测操作系统
if [ -f /etc/redhat-release ]; then
    OS='centos'
elif cat /etc/issue | grep -Eqi "debian"; then
    OS='debian'
elif cat /etc/issue | grep -Eqi "ubuntu"; then
    OS='ubuntu'
elif cat /etc/issue | grep -Eqi "centos|red hat|redhat"; then
    OS='centos'
elif cat /etc/proc/version | grep -Eqi "debian"; then
    OS='debian'
elif cat /etc/proc/version | grep -Eqi "ubuntu"; then
    OS='ubuntu'
elif cat /etc/proc/version | grep -Eqi "centos|red hat|redhat"; then
    OS='centos'
else
    echo -e "${RED}不支持的操作系统${PLAIN}"
    exit 1
fi

echo -e "检测到您的操作系统为: ${GREEN}${OS}${PLAIN}"
echo ""

# 安装依赖
echo -e "=================================================================="
echo -e "开始安装依赖包..."
echo -e "=================================================================="

if [ "${OS}" == "centos" ]; then
    yum install -y wget curl git
elif [ "${OS}" == "ubuntu" ] || [ "${OS}" == "debian" ]; then
    apt-get update -y
    apt-get install -y wget curl git
fi

echo -e "${GREEN}依赖包安装完成${PLAIN}"
echo ""

# 安装Node.js
echo -e "=================================================================="
echo -e "开始安装Node.js..."
echo -e "=================================================================="

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}Node.js已安装: $NODE_VERSION${PLAIN}"
else
    # 安装nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # 安装Node.js 22
    nvm install 22
    nvm use 22
    nvm alias default 22
    
    echo -e "${GREEN}Node.js安装完成${PLAIN}"
fi
echo ""

# 安装MySQL
echo -e "=================================================================="
echo -e "开始安装MySQL数据库..."
echo -e "=================================================================="

if command -v mysql &> /dev/null; then
    echo -e "${GREEN}MySQL已安装${PLAIN}"
else
    if [ "${OS}" == "centos" ]; then
        yum install -y mysql-server
        systemctl start mysqld
        systemctl enable mysqld
    elif [ "${OS}" == "ubuntu" ] || [ "${OS}" == "debian" ]; then
        apt-get install -y mysql-server
        systemctl start mysql
        systemctl enable mysql
    fi
    echo -e "${GREEN}MySQL安装完成${PLAIN}"
fi
echo ""

# 配置数据库
echo -e "=================================================================="
echo -e "开始配置数据库..."
echo -e "=================================================================="

DB_NAME="server_panel"
DB_USER="panel_user"
DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';" 2>/dev/null
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';" 2>/dev/null
mysql -e "FLUSH PRIVILEGES;" 2>/dev/null

echo -e "${GREEN}数据库配置完成${PLAIN}"
echo ""

# 下载面板代码
echo -e "=================================================================="
echo -e "开始下载面板程序..."
echo -e "=================================================================="

INSTALL_DIR="/opt/server-panel"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# 克隆代码
git clone https://github.com/gitjlok/server-management-panel.git . 2>&1 | grep -v "warning:"

if [ $? -ne 0 ]; then
    echo -e "${RED}代码下载失败，请检查网络连接${PLAIN}"
    exit 1
fi

echo -e "${GREEN}面板程序下载完成${PLAIN}"
echo ""

# 安装依赖包
echo -e "=================================================================="
echo -e "开始安装面板依赖..."
echo -e "=================================================================="

npm install -g pnpm >/dev/null 2>&1
pnpm install

echo -e "${GREEN}依赖包安装完成${PLAIN}"
echo ""

# 生成配置文件
echo -e "=================================================================="
echo -e "开始生成配置文件..."
echo -e "=================================================================="

PANEL_USERNAME="admin"
PANEL_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
JWT_SECRET=$(openssl rand -base64 32)

cat > $INSTALL_DIR/.env << EOF
NODE_ENV=production
PORT=8888
DATABASE_URL=mysql://${DB_USER}:${DB_PASSWORD}@localhost:3306/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
PANEL_USERNAME=${PANEL_USERNAME}
PANEL_PASSWORD=${PANEL_PASSWORD}
EOF

# 保存凭据
cat > $INSTALL_DIR/.panel-credentials << EOF
==========================================
服务器管理面板 - 登录凭据
==========================================

访问地址: http://YOUR_SERVER_IP:8888

登录信息:
  用户名: ${PANEL_USERNAME}
  密码:   ${PANEL_PASSWORD}

数据库信息:
  数据库名: ${DB_NAME}
  用户名:   ${DB_USER}
  密码:     ${DB_PASSWORD}

重要提示:
  1. 请妥善保管登录凭据
  2. 建议首次登录后立即修改密码
  3. 凭据保存位置: ${INSTALL_DIR}/.panel-credentials

==========================================
EOF

echo -e "${GREEN}配置文件生成完成${PLAIN}"
echo ""

# 构建项目
echo -e "=================================================================="
echo -e "开始编译面板程序..."
echo -e "=================================================================="

pnpm build

echo -e "${GREEN}面板程序编译完成${PLAIN}"
echo ""

# 配置systemd服务
echo -e "=================================================================="
echo -e "开始配置系统服务..."
echo -e "=================================================================="

cat > /etc/systemd/system/server-panel.service << EOF
[Unit]
Description=Server Management Panel
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(which node) ${INSTALL_DIR}/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable server-panel >/dev/null 2>&1

echo -e "${GREEN}系统服务配置完成${PLAIN}"
echo ""

# 配置防火墙
echo -e "=================================================================="
echo -e "防火墙配置"
echo -e "=================================================================="
echo ""
echo -e "面板需要开放以下端口才能正常访问:"
echo -e "  ${GREEN}8888${PLAIN}/tcp  (面板管理端口)"
echo -e "  ${GREEN}3306${PLAIN}/tcp  (MySQL数据库端口, 可选)"
echo ""

# 检测防火墙
FIREWALL_TYPE="none"
if command -v ufw &> /dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
    FIREWALL_TYPE="ufw"
elif command -v firewall-cmd &> /dev/null && systemctl is-active --quiet firewalld 2>/dev/null; then
    FIREWALL_TYPE="firewalld"
elif command -v iptables &> /dev/null; then
    FIREWALL_TYPE="iptables"
fi

if [ "$FIREWALL_TYPE" != "none" ]; then
    echo -e "检测到防火墙类型: ${GREEN}${FIREWALL_TYPE}${PLAIN}"
    echo ""
    read -p "是否自动配置防火墙开放 8888 端口? [Y/n]: " OPEN_PORT
    OPEN_PORT=${OPEN_PORT:-Y}
    
    if [[ "$OPEN_PORT" =~ ^[Yy]$ ]]; then
        case $FIREWALL_TYPE in
            ufw)
                ufw allow 8888/tcp >/dev/null 2>&1
                echo -e "${GREEN}已开放8888端口${PLAIN}"
                ;;
            firewalld)
                firewall-cmd --permanent --add-port=8888/tcp >/dev/null 2>&1
                firewall-cmd --reload >/dev/null 2>&1
                echo -e "${GREEN}已开放8888端口${PLAIN}"
                ;;
            iptables)
                iptables -I INPUT -p tcp --dport 8888 -j ACCEPT
                if command -v iptables-save &> /dev/null; then
                    iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
                fi
                echo -e "${GREEN}已开放8888端口${PLAIN}"
                ;;
        esac
    fi
else
    echo -e "${YELLOW}未检测到防火墙${PLAIN}"
fi

echo ""
echo -e "${YELLOW}提示: 如使用云服务器，请在云控制台安全组中开放 8888 端口${PLAIN}"
echo ""

# 启动面板
echo -e "=================================================================="
echo -e "开始启动面板服务..."
echo -e "=================================================================="

systemctl start server-panel

# 检查服务状态
sleep 3
if systemctl is-active --quiet server-panel; then
    echo -e "${GREEN}面板服务启动成功${PLAIN}"
else
    echo -e "${RED}面板服务启动失败，请检查日志: journalctl -u server-panel -n 50${PLAIN}"
fi

echo ""

# 计算安装时间
end_time=$(date +%s)
install_time=$((end_time - start_time))
minutes=$((install_time / 60))
seconds=$((install_time % 60))

# 获取服务器IP
SERVER_IP=$(curl -s ip.sb 2>/dev/null || curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

# 打印最终信息
echo -e "=================================================================="
echo -e "${GREEN}恭喜! 服务器管理面板安装完成${PLAIN}"
echo -e "=================================================================="
echo ""
echo -e "安装用时: ${minutes}分${seconds}秒"
echo ""
echo -e "=================================================================="
echo -e "面板访问信息"
echo -e "=================================================================="
echo ""
echo -e "外网面板地址: ${GREEN}http://${SERVER_IP}:8888${PLAIN}"
echo -e "内网面板地址: ${GREEN}http://127.0.0.1:8888${PLAIN}"
echo ""
echo -e "用户名: ${GREEN}${PANEL_USERNAME}${PLAIN}"
echo -e "密码:   ${GREEN}${PANEL_PASSWORD}${PLAIN}"
echo ""
echo -e "=================================================================="
echo -e "温馨提示"
echo -e "=================================================================="
echo ""
echo -e "1. 请妥善保管登录凭据"
echo -e "2. 首次登录后建议立即修改密码"
echo -e "3. 凭据已保存至: ${INSTALL_DIR}/.panel-credentials"
echo -e "4. 如无法访问面板，请检查:"
echo -e "   - 防火墙是否开放8888端口"
echo -e "   - 云服务器安全组是否开放8888端口"
echo -e "   - 面板服务是否正常运行: systemctl status server-panel"
echo ""
echo -e "=================================================================="
echo -e "常用命令"
echo -e "=================================================================="
echo ""
echo -e "启动面板: ${GREEN}systemctl start server-panel${PLAIN}"
echo -e "停止面板: ${GREEN}systemctl stop server-panel${PLAIN}"
echo -e "重启面板: ${GREEN}systemctl restart server-panel${PLAIN}"
echo -e "查看状态: ${GREEN}systemctl status server-panel${PLAIN}"
echo -e "查看日志: ${GREEN}journalctl -u server-panel -f${PLAIN}"
echo ""
echo -e "=================================================================="
echo ""
