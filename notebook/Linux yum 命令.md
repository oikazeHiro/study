# Linux yum 命令
[toc]

yum（ Yellow dog Updater, Modified）是一个在 Fedora 和 RedHat 以及 SUSE 中的 Shell 前端软件包管理器。

### yum 语法

> yum [options] [command] [package ...]

- options：可选，选项包括-h（帮助），-y（当安装过程提示选择全部为 "yes"），-q（不显示安装的过程）等等。
- command：要进行的操作。
- package：安装的包名。

### yum常用命令

- 1. 列出所有可更新的软件清单命令：yum check-update
- 
- 2. 更新所有软件命令：yum update
- 
- 3. 仅安装指定的软件命令：yum install <package_name>
- 
- 4. 仅更新指定的软件命令：yum update <package_name>
- 
- 5. 列出所有可安裝的软件清单命令：yum list
- 
- 6. 删除软件包命令：yum remove <package_name>
- 
- 7. 查找软件包命令：yum search <keyword>
- 
- 8. 清除缓存命令:
- yum clean packages: 清除缓存目录下的软件包
- yum clean headers: 清除缓存目录下的 headers
- yum clean oldheaders: 清除缓存目录下旧的 headers
- yum clean, yum clean all (= yum clean packages; yum clean oldheaders) :清除缓存目录下的软件包及旧的 headers

### 国内 yum 源

#### 安装步骤

首先备份/etc/yum.repos.d/CentOS-Base.repo

> mv /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.backup

下载对应版本 repo 文件, 放入 /etc/yum.repos.d/ (操作前请做好相应备份)

- CentOS5 ：http://mirrors.163.com/.help/CentOS5-Base-163.repo
- CentOS6 ：http://mirrors.163.com/.help/CentOS6-Base-163.repo
- CentOS7 ：http://mirrors.163.com/.help/CentOS7-Base-163.repo

> wget http://mirrors.163.com/.help/CentOS6-Base-163.repo
> mv CentOS6-Base-163.repo CentOS-Base.repo

运行以下命令生成缓存

> yum clean all
> yum makecache