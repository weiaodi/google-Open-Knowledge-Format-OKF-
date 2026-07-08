# HTTPS 域名部署排查全记录

> 域名：flqartw.cn  
> 服务器：阿里云国际节点 ECS（47.254.82.193，Alibaba Cloud Linux 3）  
> 应用：libredesk（Docker 容器，跑在 9000 端口）  
> DNS 托管：Cloudflare

---

## 一、最终架构

```
用户浏览器
    ↓ HTTPS (443)
Cloudflare 服务器（自动处理 SSL 证书）
    ↓ HTTP (80)
阿里云 ECS 47.254.82.193
    └── Nginx（反向代理，80 端口）
            ↓
        libredesk Docker 容器（9000 端口）
            ├── PostgreSQL（5432）
            └── Redis（6379）
```

---

## 二、Nginx 在这里的作用

很多人会问：Cloudflare 已经处理了 HTTPS，为什么还需要 Nginx？

### Nginx 的核心职责

| 职责 | 说明 |
|-----|------|
| **反向代理** | 接收 Cloudflare 转发来的 HTTP 请求，转发给 libredesk:9000 |
| **端口映射** | 外部访问 80 端口，内部映射到 9000，应用不需要暴露在公网 |
| **Host 头透传** | 把真实域名、客户端 IP 等信息传给后端应用 |
| **WebSocket 支持** | libredesk 使用 WebSocket 做实时通信，Nginx 负责升级协议 |
| **请求大小控制** | 限制上传文件最大 100MB（对应 libredesk 配置） |
| **多应用共存** | 如果以后还有其他应用，可以用同一个 Nginx 按域名分发 |

### 没有 Nginx 会怎样

如果没有 Nginx，libredesk 必须直接监听 80 端口，但：
- 9000 端口不是标准 HTTP 端口，用户必须输入 `http://flqartw.cn:9000` 才能访问
- 无法同一台服务器部署多个域名/应用
- 无法方便地控制请求大小、超时等参数

### 一句话总结

> **Cloudflare 负责外网 HTTPS，Nginx 负责把请求从 80 端口"搬运"到应用的 9000 端口。**

---

## 三、完整排查过程与遇到的问题

### 问题 1：DNS 解析不生效（阿里云 vs Cloudflare 冲突）

**现象：** 在阿里云云解析 DNS 里配置了 A 记录，但访问域名没有任何响应。

**根本原因：**  
域名 NS 服务器已经指向了 Cloudflare（`liv.ns.cloudflare.com` / `carl.ns.cloudflare.com`），  
但实际在阿里云云解析里配置 A 记录，两套 DNS 系统冲突，阿里云的配置**完全不生效**。

阿里云控制台有黄色警告提示：
> 未接入使用云解析DNS，当前配置的解析记录不会生效。

**解法：** 忽略阿里云云解析，所有 DNS 记录只在 **Cloudflare** 里配置。

```
Cloudflare DNS Records:
  A  @    → 47.254.82.193  （橙色云朵/Proxied）
  A  www  → 47.254.82.193  （橙色云朵/Proxied）
```

---

### 问题 2：80 端口 Connection Refused

**现象：**
```
curl http://www.flqartw.cn
→ connect to 47.254.82.193 port 80 failed: Connection refused
```

**根本原因：** 服务器上根本没有安装 Nginx，没有任何服务在监听 80 端口。

**解法：** 安装并启动 Nginx。

注意：服务器是 Alibaba Cloud Linux 3（RHEL 系），**不能用 `apt`，要用 `yum`**：

```bash
# 错误命令（Ubuntu 用）
apt install nginx   # → command not found

# 正确命令（阿里云 Linux / CentOS 系）
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

### 问题 3：403 Forbidden

**现象：**
```
curl http://www.flqartw.cn
→ 403 Forbidden
```

**根本原因：** Nginx 配置指向的网站目录 `/var/www/flqartw/dist/` 存在，但里面没有任何文件（`index.html` 未创建成功）。

**echo 创建文件失败的原因：** bash 里 `!` 是特殊历史扩展字符，以下命令会报错：
```bash
echo "<h1>Hello!</h1>"   # → event not found（! 被当作特殊字符）
```

**解法：** 用 `printf` 代替 `echo`，或先写入 `/tmp` 再复制：
```bash
sudo printf '<h1>Hello flqartw.cn - OK</h1>\n' > /tmp/test.html
sudo cp /tmp/test.html /var/www/flqartw/dist/index.html
sudo chown nginx:nginx /var/www/flqartw/dist/index.html
sudo chmod 644 /var/www/flqartw/dist/index.html
```

---

### 问题 4：firewalld 报错（非问题）

**现象：**
```bash
sudo firewall-cmd --permanent --add-service=http
→ FirewallD is not running
```

**说明：** 这不是真正的问题。阿里云 ECS 默认不启用 firewalld，**端口控制完全由阿里云安全组负责**，不需要管 firewalld。

**必须做的是：** 去阿里云控制台 → ECS → 安全组 → 入方向，手动添加：

| 协议 | 端口 | 来源 |
|-----|------|------|
| TCP | 80/80 | 0.0.0.0/0 |
| TCP | 443/443 | 0.0.0.0/0 |

---

### 问题 5：HTTPS 怎么自动就有了？

**疑问：** 没有在服务器上安装任何 SSL 证书，为什么 `https://www.flqartw.cn` 可以访问？

**原因：** Cloudflare 的橙色云朵（Proxied）模式会自动：
1. 申请 SSL 证书（由 Google Trust Services 签发，免费、自动续签）
2. 对外提供 HTTPS（443 端口）
3. 对内用 HTTP 请求你的服务器（80 端口）

curl 验证结果：
```
IPv4: 172.67.221.100  ← Cloudflare 的 IP（不是你的服务器 IP）
issuer: Google Trust Services
SSL certificate verify ok.
```

**结论：** 服务器完全不需要配置 SSL 证书，Cloudflare 帮你全包了。

---

### 问题 6：API 请求 301 重定向（双斜杠）

**现象：**
```
GET https://flqartw.cn//api/v1/widget/chat/settings/launcher?...
→ 301 Moved Permanently
```

**原因：** URL 里出现双斜杠 `//api`，Nginx 默认会将其重定向到 `/api`（301）。  
根本原因是 libredesk 后台配置的 `site_url` 末尾带了多余的 `/`，导致拼接 URL 时出现双斜杠。

**解法：**
1. 检查 libredesk 后台的 Site URL 配置，去掉末尾斜杠：
   ```
   ❌ https://flqartw.cn/
   ✅ https://flqartw.cn
   ```
2. Nginx 配置可加 `merge_slashes on;` 自动合并重复斜杠。

---

## 四、最终 Nginx 配置

```nginx
# /etc/nginx/conf.d/flqartw.conf

server {
    listen 80;
    server_name flqartw.cn www.flqartw.cn;

    merge_slashes on;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;

        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        client_max_body_size 100m;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    access_log /var/log/nginx/flqartw.access.log;
    error_log  /var/log/nginx/flqartw.error.log;
}
```

---

## 五、常用运维命令

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 检查配置语法
sudo nginx -t

# 重载配置（不中断服务）
sudo systemctl reload nginx

# 查看访问日志
tail -f /var/log/nginx/flqartw.access.log

# 查看错误日志
tail -f /var/log/nginx/flqartw.error.log

# 查看 libredesk 容器状态
cd /opt/libredesk && docker compose ps

# 查看 libredesk 日志
cd /opt/libredesk && docker compose logs -f app
```

---

## 六、经验总结

1. **阿里云 ECS + Cloudflare 组合时**，DNS 只在 Cloudflare 配，阿里云云解析完全不用
2. **阿里云安全组是真正的防火墙**，`firewalld` 默认不启用，不用管
3. **Cloudflare 橙色云朵 = 免费 HTTPS**，服务器不需要安装 SSL 证书
4. **阿里云 Linux 用 `yum`/`dnf`**，不要用 `apt`
5. **bash 历史扩展**：`echo "内容含!"` 会报错，用 `printf` 或 `heredoc` 代替
6. **Nginx 的角色**：不是提供 HTTPS，而是做端口转发（80 → 应用端口）
