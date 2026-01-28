#!/bin/bash
# 服务器管理面板一键安装脚本
# 使用方法: if [ -f /usr/bin/curl ];then curl -sSO https://raw.githubusercontent.com/your-repo/server-panel/main/install.sh;else wget -O install.sh https://raw.githubusercontent.com/your-repo/server-panel/main/install.sh;fi;bash install.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用root权限运行此脚本"
        exit 1
    fi
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        print_error "无法检测操作系统"
        exit 1
    fi
    
    print_info "检测到操作系统: $OS $VERSION"
}

# 安装依赖
install_dependencies() {
    print_info "正在安装系统依赖..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get update -y
        apt-get install -y curl wget git build-essential
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        yum update -y
        yum install -y curl wget git gcc-c++ make
    else
        print_warning "未知的操作系统，尝试继续安装..."
    fi
    
    print_success "系统依赖安装完成"
}

# 安装Node.js
install_nodejs() {
    print_info "正在安装Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_info "Node.js已安装: $NODE_VERSION"
        return
    fi
    
    # 安装nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # 安装Node.js 22
    nvm install 22
    nvm use 22
    nvm alias default 22
    
    print_success "Node.js安装完成"
}

# 安装MySQL
install_mysql() {
    print_info "正在检查MySQL..."
    
    if command -v mysql &> /dev/null; then
        print_info "MySQL已安装"
        return
    fi
    
    print_info "正在安装MySQL..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get install -y mysql-server
        systemctl start mysql
        systemctl enable mysql
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        yum install -y mysql-server
        systemctl start mysqld
        systemctl enable mysqld
    fi
    
    print_success "MySQL安装完成"
}

# 生成随机密码
generate_password() {
    openssl rand -base64 16 | tr -d "=+/" | cut -c1-16
}

# 创建数据库
setup_database() {
    print_info "正在配置数据库..."
    
    DB_NAME="server_panel"
    DB_USER="panel_user"
    DB_PASSWORD=$(generate_password)
    
    mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
    mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
    mysql -e "FLUSH PRIVILEGES;"
    
    print_success "数据库配置完成"
}

# 下载并安装面板
install_panel() {
    print_info "正在下载服务器管理面板..."
    
    INSTALL_DIR="/opt/server-panel"
    
    # 创建安装目录
    mkdir -p $INSTALL_DIR
    cd $INSTALL_DIR
    
    # 这里应该从您的仓库下载代码
    # git clone https://github.com/your-repo/server-panel.git .
    
    print_info "正在安装依赖包..."
    npm install -g pnpm
    pnpm install
    
    print_success "面板安装完成"
}

# 生成面板登录凭据
generate_panel_credentials() {
    print_info "正在生成面板登录凭据..."
    
    PANEL_USERNAME="admin"
    PANEL_PASSWORD=$(generate_password)
    
    # 保存到配置文件
    cat > /opt/server-panel/.panel-credentials << EOF
PANEL_USERNAME=${PANEL_USERNAME}
PANEL_PASSWORD=${PANEL_PASSWORD}
EOF
    
    chmod 600 /opt/server-panel/.panel-credentials
    
    print_success "登录凭据已生成"
}

# 配置环境变量
setup_env() {
    print_info "正在配置环境变量..."
    
    cat > /opt/server-panel/.env << EOF
NODE_ENV=production
PORT=8888
DATABASE_URL=mysql://${DB_USER}:${DB_PASSWORD}@localhost:3306/${DB_NAME}
JWT_SECRET=$(openssl rand -base64 32)
PANEL_USERNAME=${PANEL_USERNAME}
PANEL_PASSWORD=${PANEL_PASSWORD}
EOF
    
    chmod 600 /opt/server-panel/.env
    
    print_success "环境变量配置完成"
}

# 配置系统服务
setup_systemd() {
    print_info "正在配置系统服务..."
    
    cat > /etc/systemd/system/server-panel.service << EOF
[Unit]
Description=Server Management Panel
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/server-panel
ExecStart=/usr/bin/node /opt/server-panel/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable server-panel
    
    print_success "系统服务配置完成"
}

# 配置防火墙
setup_firewall() {
    print_info "正在配置防火墙..."
    
    if command -v ufw &> /dev/null; then
        ufw allow 8888/tcp
        print_success "UFW防火墙规则已添加"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=8888/tcp
        firewall-cmd --reload
        print_success "Firewalld防火墙规则已添加"
    else
        print_warning "未检测到防火墙，请手动开放8888端口"
    fi
}

# 启动面板
start_panel() {
    print_info "正在启动面板..."
    
    cd /opt/server-panel
    pnpm build
    systemctl start server-panel
    
    print_success "面板已启动"
}

# 显示安装信息
show_info() {
    SERVER_IP=$(curl -s ifconfig.me)
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}服务器管理面板安装完成！${NC}"
    echo "=========================================="
    echo ""
    echo -e "${BLUE}访问地址:${NC} http://${SERVER_IP}:8888"
    echo ""
    echo -e "${BLUE}登录凭据:${NC}"
    echo -e "  用户名: ${GREEN}${PANEL_USERNAME}${NC}"
    echo -e "  密码:   ${GREEN}${PANEL_PASSWORD}${NC}"
    echo ""
    echo -e "${YELLOW}重要提示:${NC}"
    echo "  1. 请妥善保管登录凭据"
    echo "  2. 凭据已保存至: /opt/server-panel/.panel-credentials"
    echo "  3. 建议首次登录后立即修改密码"
    echo ""
    echo -e "${BLUE}常用命令:${NC}"
    echo "  启动面板: systemctl start server-panel"
    echo "  停止面板: systemctl stop server-panel"
    echo "  重启面板: systemctl restart server-panel"
    echo "  查看状态: systemctl status server-panel"
    echo "  查看日志: journalctl -u server-panel -f"
    echo ""
    echo "=========================================="
}

# 主函数
main() {
    clear
    echo "=========================================="
    echo "  服务器管理面板 - 一键安装脚本"
    echo "=========================================="
    echo ""
    
    check_root
    detect_os
    install_dependencies
    install_nodejs
    install_mysql
    setup_database
    install_panel
    generate_panel_credentials
    setup_env
    setup_systemd
    setup_firewall
    start_panel
    show_info
}

# 执行主函数
main
