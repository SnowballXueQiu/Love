# Database & Storage Setup SQL

此文件夹包含了项目所需的 Supabase 数据库和存储桶的初始化 SQL 脚本。

## 文件说明

### 1. `00_schema_setup.sql` (核心表结构)
**用途**: 初始化数据库的核心表结构。
**包含内容**:
- `songs`: 存储音乐信息 (ID, 标题, 艺术家, URL, 上传者等)。
- `photos`: 存储照片墙信息 (图片URL数组, 描述, 日期等)。
- `messages`: 存储留言板信息 (内容, 日期, 发送者)。
- `blessings`: 存储祝福计数。
- `settings`: 存储应用配置 (双人名称, 头像, 密码, 开始日期等)。
- 启用 Realtime 功能。

### 2. `01_storage_setup.sql` (存储桶配置)
**用途**: 配置 Supabase Storage 存储桶及其访问策略。
**包含内容**:
- 创建 `music` 存储桶：用于存放上传的音乐文件。
- 创建 `photos` 存储桶：用于存放上传的照片。
- 配置 RLS (Row Level Security) 策略，允许公开的读取、上传、更新和删除操作（方便开发和演示，生产环境建议收紧权限）。

### 3. `02_fix_songs_table.sql` (权限与缓存修复)
**用途**: 解决 `songs` 表可能出现的权限问题或 Schema 缓存不同步问题。
**包含内容**:
- 确保 `songs` 表存在。
- 重置并重新应用 RLS 策略，确保 `anon` (匿名用户) 和 `authenticated` (登录用户) 都有完全访问权限。
- 执行 `NOTIFY pgrst, 'reload schema';` 强制 PostgREST 重新加载 Schema 缓存（解决 "Could not find the table..." 错误）。

### 4. `99_legacy_supabase_schema.sql` (旧版/备份)
**用途**: 项目早期的 Schema 备份文件。
**说明**: 包含了一些早期的表定义和默认数据插入语句。主要作为参考保留，建议使用 `00_schema_setup.sql` 进行初始化。

## 使用方法

1. 进入 [Supabase Dashboard](https://supabase.com/dashboard)。
2. 选择你的项目，进入 **SQL Editor**。
3. 依次复制上述 SQL 文件的内容并运行：
   - 先运行 `00_schema_setup.sql` 创建表。
   - 再运行 `01_storage_setup.sql` 创建存储桶。
   - 如果遇到权限或找不到表的问题，运行 `02_fix_songs_table.sql`。

## 注意事项

- **安全性**: 当前的 RLS 策略较为宽松（允许公开增删改查），主要为了方便个人使用和演示。如果部署到公开环境，建议修改 Policy 限制删除和修改权限。
- **Realtime**: 脚本中包含了启用 Realtime 的语句，确保客户端能实时收到更新。
