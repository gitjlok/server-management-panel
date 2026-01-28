# 服务器管理面板 - 部署指南

## 一键安装

### 快速安装命令

在您的服务器上执行以下命令即可完成安装：

```bash
curl -sSL https://your-domain.com/install.sh | bash
```

或者使用wget：

```bash
wget -O - https://your-domain.com/install.sh | bash
```

### 系统要求

- **操作系统**: Ubuntu 18.04+, Debian 10+, CentOS 7+, RHEL 7+
- **内存**: 最低 1GB RAM，推荐 2GB+
- **磁盘空间**: 最低 10GB 可用空间
- **权限**: 需要root权限

### 安装过程

安装脚本将自动完成以下步骤：

1. ✅ 检测操作系统类型和版本
2. ✅ 安装系统依赖包（curl, wget, git等）
3. ✅ 安装Node.js 22（通过nvm）
4. ✅ 安装和配置MySQL数据库
5. ✅ 创建面板专用数据库和用户
6. ✅ 下载并安装服务器管理面板
7. ✅ 自动生成安全的登录凭据
8. ✅ 配置环境变量
9. ✅ 创建systemd系统服务
10. ✅ 配置防火墙规则（开放8888端口）
11. ✅ 启动面板服务

### 安装完成后

安装完成后，您将看到类似以下的信息：

```
==========================================
服务器管理面板安装完成！
==========================================

访问地址: http://YOUR_SERVER_IP:8888

登录凭据:
  用户名: admin
  密码:   AbCd1234EfGh5678

重要提示:
  1. 请妥善保管登录凭据
  2. 凭据已保存至: /opt/server-panel/.panel-credentials
  3. 建议首次登录后立即修改密码

常用命令:
  启动面板: systemctl start server-panel
  停止面板: systemctl stop server-panel
  重启面板: systemctl restart server-panel
  查看状态: systemctl status server-panel
  查看日志: journalctl -u server-panel -f

==========================================
```

## 手动安装

如果您希望手动安装，请按照以下步骤操作：

### 1. 安装依赖

```bash
# Ubuntu/Debian
apt-get update
apt-get install -y curl wget git build-essential mysql-server

# CentOS/RHEL
yum update
yum install -y curl wget git gcc-c++ make mysql-server
```

### 2. 安装Node.js

```bash
# 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 加载nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 安装Node.js 22
nvm install 22
nvm use 22
nvm alias default 22
```

### 3. 配置数据库

```bash
# 登录MySQL
mysql -u root -p

# 创建数据库和用户
CREATE DATABASE server_panel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'panel_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON server_panel.* TO 'panel_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. 下载面板代码

```bash
mkdir -p /opt/server-panel
cd /opt/server-panel
git clone https://github.com/your-repo/server-panel.git .
```

### 5. 安装依赖包

```bash
npm install -g pnpm
pnpm install
```

### 6. 配置环境变量

创建 `.env` 文件：

```bash
cat > .env << EOF
NODE_ENV=production
PORT=8888
DATABASE_URL=mysql://panel_user:your_password@localhost:3306/server_panel
JWT_SECRET=$(openssl rand -base64 32)
PANEL_USERNAME=admin
PANEL_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
EOF
```

### 7. 构建项目

```bash
pnpm build
```

### 8. 配置系统服务

创建 `/etc/systemd/system/server-panel.service`：

```ini
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
```

启用并启动服务：

```bash
systemctl daemon-reload
systemctl enable server-panel
systemctl start server-panel
```

### 9. 配置防火墙

```bash
# UFW (Ubuntu/Debian)
ufw allow 8888/tcp

# Firewalld (CentOS/RHEL)
firewall-cmd --permanent --add-port=8888/tcp
firewall-cmd --reload
```

## 管理命令

### 服务管理

```bash
# 启动面板
systemctl start server-panel

# 停止面板
systemctl stop server-panel

# 重启面板
systemctl restart server-panel

# 查看状态
systemctl status server-panel

# 查看日志
journalctl -u server-panel -f

# 查看最近100行日志
journalctl -u server-panel -n 100
```

### 查看登录凭据

```bash
cat /opt/server-panel/.panel-credentials
```

### 更新面板

```bash
cd /opt/server-panel
git pull
pnpm install
pnpm build
systemctl restart server-panel
```

### 卸载面板

```bash
# 停止服务
systemctl stop server-panel
systemctl disable server-panel

# 删除服务文件
rm /etc/systemd/system/server-panel.service
systemctl daemon-reload

# 删除面板文件
rm -rf /opt/server-panel

# 删除数据库（可选）
mysql -e "DROP DATABASE server_panel;"
mysql -e "DROP USER 'panel_user'@'localhost';"
```

## 故障排查

### 面板无法启动

1. 检查服务状态：
```bash
systemctl status server-panel
```

2. 查看详细日志：
```bash
journalctl -u server-panel -n 50
```

3. 检查端口占用：
```bash
netstat -tunlp | grep 8888
```

### 无法访问面板

1. 检查防火墙规则：
```bash
# UFW
ufw status

# Firewalld
firewall-cmd --list-all
```

2. 检查服务器安全组（云服务器）：
   - 确保8888端口在安全组中已开放

3. 检查面板是否正在运行：
```bash
ps aux | grep server-panel
```

### 数据库连接失败

1. 检查MySQL服务状态：
```bash
systemctl status mysql
# 或
systemctl status mysqld
```

2. 验证数据库连接：
```bash
mysql -u panel_user -p server_panel
```

3. 检查环境变量配置：
```bash
cat /opt/server-panel/.env
```

## 安全建议

1. **修改默认密码**: 首次登录后立即修改默认密码
2. **使用HTTPS**: 配置SSL证书启用HTTPS访问
3. **限制访问IP**: 在防火墙中限制只允许特定IP访问
4. **定期备份**: 定期备份数据库和配置文件
5. **及时更新**: 保持面板和系统软件的最新版本

## 技术支持

如有问题，请访问：
- 官方文档: https://docs.your-domain.com
- GitHub Issues: https://github.com/your-repo/server-panel/issues
- 技术支持: support@your-domain.com
