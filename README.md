# 服务器管理面板

一个功能完整、界面优雅的服务器管理面板系统，提供系统监控、文件管理、网站管理、数据库管理、进程管理、服务器部署、安全设置等核心功能。

## ✨ 功能特性

### 核心功能

- 📊 **系统监控** - 实时显示CPU、内存、磁盘、网络使用情况，支持历史数据图表
- 📁 **文件管理** - 浏览、创建、删除文件和文件夹，查看文件权限
- 🌐 **网站管理** - 创建和管理网站，配置域名、SSL证书
- 🗄️ **数据库管理** - MySQL数据库的创建、删除和管理
- ⚙️ **进程管理** - 查看和控制运行中的进程
- 🚀 **服务器部署** - 管理远程服务器连接，执行部署任务，查看部署历史
- 🔒 **安全设置** - 配置防火墙规则和IP白名单
- 📋 **操作日志** - 完整的审计日志记录
- 👥 **用户管理** - 多用户支持，角色权限控制

### 技术特点

- 🎨 优雅的深蓝色主题设计
- 🌍 完整的中文界面
- 🔐 基于Manus OAuth的认证系统
- 📱 响应式设计，支持移动端访问
- ⚡ 实时数据更新（每3秒刷新）
- 🧪 完整的单元测试覆盖

## 🚀 快速开始

### 一键安装

在您的服务器上执行以下命令：

```bash
curl -sSL https://your-domain.com/install.sh | bash
```

或使用wget：

```bash
wget -O - https://your-domain.com/install.sh | bash
```

### 系统要求

- **操作系统**: Ubuntu 18.04+, Debian 10+, CentOS 7+, RHEL 7+
- **内存**: 最低 1GB RAM，推荐 2GB+
- **磁盘空间**: 最低 10GB 可用空间
- **权限**: 需要root权限

### 安装完成后

安装完成后，您将获得：

- 🌐 访问地址: `http://YOUR_SERVER_IP:8888`
- 👤 用户名: `admin`
- 🔑 密码: 自动生成的16位随机密码

登录凭据将显示在安装完成界面，并保存在 `/opt/server-panel/.panel-credentials` 文件中。

## 📖 详细文档

完整的部署和使用文档请参阅 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 常用命令

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
```

## 🛠️ 技术栈

### 后端

- **Node.js 22** - 运行时环境
- **Express 4** - Web框架
- **tRPC 11** - 类型安全的API
- **Drizzle ORM** - 数据库ORM
- **MySQL** - 数据库

### 前端

- **React 19** - UI框架
- **Tailwind CSS 4** - 样式框架
- **shadcn/ui** - UI组件库
- **Recharts** - 图表库
- **Wouter** - 路由库

## 📊 功能截图

### 系统监控仪表板
实时显示服务器资源使用情况，包括CPU、内存、磁盘和网络状态。

### 文件管理器
直观的文件浏览界面，支持文件操作和权限管理。

### 服务器部署
管理多个远程服务器连接，执行部署任务并查看历史记录。

## 🔧 开发

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-repo/server-panel.git
cd server-panel

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置数据库连接

# 推送数据库schema
pnpm db:push

# 启动开发服务器
pnpm dev
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试并监听变化
pnpm test:watch
```

### 构建生产版本

```bash
# 构建项目
pnpm build

# 启动生产服务器
pnpm start
```

## 📝 项目结构

```
server_management_panel/
├── client/                 # 前端代码
│   ├── public/            # 静态资源
│   └── src/
│       ├── components/    # React组件
│       ├── pages/         # 页面组件
│       ├── lib/           # 工具库
│       └── App.tsx        # 应用入口
├── server/                # 后端代码
│   ├── _core/            # 核心功能
│   ├── db.ts             # 数据库操作
│   └── routers.ts        # API路由
├── drizzle/              # 数据库schema
│   └── schema.ts
├── install.sh            # 一键安装脚本
├── DEPLOYMENT.md         # 部署文档
└── README.md             # 项目说明
```

## 🔐 安全建议

1. **修改默认密码** - 首次登录后立即修改密码
2. **使用HTTPS** - 配置SSL证书启用HTTPS访问
3. **限制访问IP** - 在防火墙中限制只允许特定IP访问
4. **定期备份** - 定期备份数据库和配置文件
5. **及时更新** - 保持面板和系统软件的最新版本

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 📧 技术支持

- 官方文档: https://docs.your-domain.com
- GitHub Issues: https://github.com/your-repo/server-panel/issues
- 技术支持: support@your-domain.com

---

**注意**: 此面板设计用于内部管理和受信任的环境。在生产环境中使用时，请确保采取适当的安全措施。
