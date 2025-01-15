# docker

[toc]

弱小和无知不是生存的障碍，傲慢才是

#### 文档地址

> https://docs.docker.com/



#### 比较docker和虚拟机的不同

- 传统虚拟机，虚拟出一个硬件，运行一个完整的操作系统，然后在这个系统上安装和运行软件
- 容器内的应用直接运行在宿主机的内核，容器是没有自己的内核的，也没有虚拟我们的硬件，所以就轻便
- 每个容器是互相隔离，每个容器内都有一个属于自己的文件系统，互不影响



#### docker架构图

![查看源图像](https://tse3-mm.cn.bing.net/th/id/OIP-C.UaGmkp_GVreTU451sPj6OwHaD-?pid=ImgDet&rs=1)

镜像（image）：

docker镜像就好比是一个模板，可以通过这个模板来创建容器服务

容器（container）：

docker利用容器技术，独立运行一个或者一组应用来创建的

启动，停止，删除，基本命令！

目前就可以把这个容器理解为就是一个简易的linux系统

仓库（repository）:

仓库就是存放镜像的地方

仓库分为公有仓库和私有仓库！

docker Hup (默认是国外的)

阿里云......都有容器服务器（配置镜像加速）



# debian 安装 

## 先决条件

### 操作系统要求

要安装 Docker Engine，您需要以下 Debian 或 Raspbian 版本之一的 64 位版本：

- Debian Bullseye 11（稳定版）
- Debian Buster 10（旧稳定版）
- Raspbian Bullseye 11（稳定版）
- Raspbian Buster 10（旧马厩）

`x86_64`（或`amd64`）`armhf`、 和`arm64`架构支持 Docker 引擎。

### 卸载旧版本

旧版本的 Docker 被称为`docker`,`docker.io`或`docker-engine`. 如果安装了这些，请卸载它们：

```
$ sudo apt-get remove docker docker-engine docker.io containerd runc
```

`apt-get`如果报告没有安装这些软件包，那也没关系。

的内容`/var/lib/docker/`，包括图像、容器、卷和网络，都被保留。如果您不需要保存现有数据，并且想从全新安装开始，请参阅 本页底部的[卸载 Docker 引擎部分。](https://docs.docker.com/engine/install/debian/#uninstall-docker-engine)

## 安装方法

您可以根据需要以不同的方式安装 Docker Engine：

- 大多数用户 [设置 Docker 的存储库](https://docs.docker.com/engine/install/debian/#install-using-the-repository)并从中安装，以便于安装和升级任务。这是推荐的方法，除了 Raspbian。
- 一些用户下载 DEB 包并 [手动安装，](https://docs.docker.com/engine/install/debian/#install-from-a-package)完全手动管理升级。这在诸如在无法访问 Internet 的气隙系统上安装 Docker 等情况下很有用。
- 在测试和开发环境中，一些用户选择使用自动化 [便利脚本](https://docs.docker.com/engine/install/debian/#install-using-the-convenience-script)来安装 Docker。这是目前 Raspbian 的唯一方法。

### 使用存储库安装

在新主机上首次安装 Docker Engine 之前，您需要设置 Docker 存储库。之后，您可以从存储库安装和更新 Docker。

> **Raspbian 用户不能使用此方法！**
>
> 对于 Raspbian，尚不支持使用存储库进行安装。您必须改为使用[便捷脚本](https://docs.docker.com/engine/install/debian/#install-using-the-convenience-script)。

#### 设置存储库

1. 更新`apt`包索引并安装包以允许`apt`通过 HTTPS 使用存储库：

   ```
   $ sudo apt-get update
   
   $ sudo apt-get install \
       ca-certificates \
       curl \
       gnupg \
       lsb-release
   ```

2. 添加 Docker 的官方 GPG 密钥：

   ```
   $ sudo mkdir -p /etc/apt/keyrings
   $ curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   ```

3. 使用以下命令设置存储库：

   ```
   $ echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
     $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   ```

#### 安装 Docker 引擎

此过程适用于`x86_64`/ `amd64`、`armhf`、`arm64`和 Raspbian 上的 Debian。

1. 更新`apt`包索引，安装*最新版本*的 Docker Engine、containerd 和 Docker Compose，或者进入下一步安装特定版本：

   ```
    $ sudo apt-get update
    $ sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
   ```

   > 运行时收到 GPG 错误`apt-get update`？
   >
   > 您的默认 umask 可能设置不正确，导致无法检测到 repo 的公钥文件。运行以下命令，然后再次尝试更新您的存储库：`sudo chmod a+r /etc/apt/keyrings/docker.gpg`.

2. 要安装*特定版本*的 Docker Engine，请在 repo 中列出可用版本，然后选择并安装：

   一个。列出您的存储库中可用的版本：

   ```
   $ apt-cache madison docker-ce
   
     docker-ce | 5:18.09.1~3-0~debian-stretch | https://download.docker.com/linux/debian stretch/stable amd64 Packages
     docker-ce | 5:18.09.0~3-0~debian-stretch | https://download.docker.com/linux/debian stretch/stable amd64 Packages
     docker-ce | 18.06.1~ce~3-0~debian        | https://download.docker.com/linux/debian stretch/stable amd64 Packages
     docker-ce | 18.06.0~ce~3-0~debian        | https://download.docker.com/linux/debian stretch/stable amd64 Packages
   ```

   湾。使用第二列中的版本字符串安装特定版本，例如`5:18.09.1~3-0~debian-stretch`.

   ```
   $ sudo apt-get install docker-ce=<VERSION_STRING> docker-ce-cli=<VERSION_STRING> containerd.io docker-compose-plugin
   ```

3. `hello-world` 通过运行映像来验证 Docker 引擎是否已正确安装。

   ```
   $ sudo docker run hello-world
   ```

   此命令下载测试映像并在容器中运行它。当容器运行时，它会打印一条消息并退出。

Docker 引擎已安装并正在运行。该`docker`组已创建，但未向其中添加任何用户。您需要使用`sudo`来运行 Docker 命令。继续[Linux 后安装](https://docs.docker.com/engine/install/linux-postinstall/)以允许非特权用户运行 Docker 命令和其他可选配置步骤。

#### 升级 Docker 引擎

要升级 Docker Engine，首先运行`sudo apt-get update`，然后按照 [安装说明](https://docs.docker.com/engine/install/debian/#install-using-the-repository)，选择您要安装的新版本。

### 从包安装

如果您无法使用 Docker 的存储库来安装 Docker Engine，您可以下载 `.deb`您的版本的文件并手动安装。每次升级 Docker 时都需要下载一个新文件。

1. 转到[`https://download.docker.com/linux/debian/dists/`](https://download.docker.com/linux/debian/dists/)，选择您的 Debian 版本，然后浏览到`pool/stable/`、选择`amd64`、 `armhf`或`arm64`，然后下载`.deb`您要安装的 Docker 引擎版本的文件。

2. 安装 Docker Engine，将下面的路径更改为您下载 Docker 包的路径。

   ```
   $ sudo dpkg -i /path/to/package.deb
   ```

   Docker 守护进程自动启动。

3. `hello-world` 通过运行映像来验证 Docker 引擎是否已正确安装。

   ```
   $ sudo docker run hello-world
   ```

   此命令下载测试映像并在容器中运行它。当容器运行时，它会打印一条消息并退出。

Docker 引擎已安装并正在运行。该`docker`组已创建，但未向其中添加任何用户。您需要使用`sudo`来运行 Docker 命令。继续[执行 Linux 的安装后步骤](https://docs.docker.com/engine/install/linux-postinstall/)以允许非特权用户运行 Docker 命令和其他可选配置步骤。

#### 升级 Docker 引擎

要升级 Docker Engine，请下载更新的包文件并重复 [安装过程](https://docs.docker.com/engine/install/debian/#install-from-a-package)，指向新文件。

### 使用便捷脚本安装

[Docker 在get.docker.com](https://get.docker.com/)上提供了一个方便的脚本， 可以快速、非交互地将 Docker 安装到开发环境中。不建议将便利脚本用于生产环境，但可以用作示例来创建适合您需求的供应脚本。另请参阅[使用存储库](https://docs.docker.com/engine/install/debian/#install-using-the-repository) 安装步骤以了解使用包存储库安装的安装步骤。该脚本的源代码是开源的，可以 [`docker-install`在 GitHub 上的存储库中找到](https://github.com/docker/docker-install)。

在本地运行脚本之前，请务必检查从 Internet 下载的脚本。在安装之前，请让自己熟悉便捷脚本的潜在风险和限制：

- 该脚本需要`root`或`sudo`特权才能运行。
- 该脚本会尝试检测您的 Linux 发行版和版本并为您配置包管理系统，并且不允许您自定义大多数安装参数。
- 该脚本会在不要求确认的情况下安装依赖项和建议。这可能会安装大量软件包，具体取决于主机的当前配置。
- 默认情况下，该脚本安装 Docker、containerd 和 runc 的最新稳定版本。使用此脚本配置机器时，可能会导致 Docker 的主要版本升级意外。在部署到生产系统之前，始终在测试环境中测试（主要）升级。
- 该脚本并非旨在升级现有的 Docker 安装。使用脚本更新现有安装时，可能无法将依赖项更新到预期版本，从而导致使用过时的版本。

> 提示：运行前预览脚本步骤
>
> 您可以使用`DRY_RUN=1`选项运行脚本以了解脚本在安装期间将执行的步骤：
>
> ```
> $ curl -fsSL https://get.docker.com -o get-docker.sh
> $ DRY_RUN=1 sh ./get-docker.sh
> ```

此示例从[get.docker.com](https://get.docker.com/)下载脚本 并运行它以在 Linux 上安装最新的稳定版本的 Docker：

```
$ curl -fsSL https://get.docker.com -o get-docker.sh
$ sudo sh get-docker.sh
Executing docker install script, commit: 7cae5f8b0decc17d6571f9f52eb840fbc13b2737
<...>
```

安装了 Docker。该`docker`服务在基于 Debian 的发行版上自动启动。在`RPM`基于发行版（例如 CentOS、Fedora、RHEL 或 SLES）上，您需要使用适当的`systemctl`or`service`命令手动启动它。如消息所示，默认情况下，非 root 用户无法运行 Docker 命令。

> **以非特权用户身份使用 Docker，还是以无根模式安装？**
>
> 安装脚本需要`root`或`sudo`具有安装和使用 Docker 的权限。如果要授予非 root 用户对 Docker 的访问权限，请参阅 [Linux 的安装后步骤](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user)。Docker 也可以在没有`root`权限的情况下安装，或者配置为以无根模式运行。有关在无根模式下运行 Docker 的说明，请参阅以 [非 root 用户身份运行 Docker 守护程序（无根模式）](https://docs.docker.com/engine/security/rootless/)。

#### 安装预发行版

Docker 还在[test.docker.com](https://test.docker.com/) 上提供了一个方便的脚本，用于在 Linux 上安装 Docker 的预发行版。此脚本等效于 中的脚本`get.docker.com`，但将您的包管理器配置为启用我们包存储库中的“测试”通道，其中包括 Docker 的稳定版和预发布版（测试版、发布候选版）。使用此脚本可以提前访问新版本，并在发布稳定之前在测试环境中对其进行评估。

要从“测试”频道在 Linux 上安装最新版本的 Docker，请运行：

```
$ curl -fsSL https://test.docker.com -o test-docker.sh
$ sudo sh test-docker.sh
<...>
```

#### 使用便利脚本后升级 Docker

如果您使用便捷脚本安装 Docker，则应直接使用包管理器升级 Docker。重新运行便利脚本没有任何好处，如果它尝试重新添加已经添加到主机的存储库，可能会导致问题。

## 卸载 Docker 引擎

1. 卸载 Docker Engine、CLI、Containerd 和 Docker Compose 软件包：

   ```
   $ sudo apt-get purge docker-ce docker-ce-cli containerd.io docker-compose-plugin
   ```

2. 主机上的映像、容器、卷或自定义配置文件不会自动删除。要删除所有映像、容器和卷：

   ```
   $ sudo rm -rf /var/lib/docker
   $ sudo rm -rf /var/lib/containerd
   ```



## 查看docker镜像

> docker images



## 底层原理

docker是怎么工作的？

docker是一个Client-server结构的系统，docker的守护进程运行在主机上，通过socket从客户端访问。DockerServer 接收到 DockerClient 的指令，就会执行这个命令



### 常用命令

```shell
docker version      # 显示docker版本信息
docker info         # 显示docker的系统信息，包括镜像和容器
docker --help       # 万能命令
```

docker帮助文档：https://docs.docker.com/reference/

### 镜像命令

***docker images 查看主机所有镜像***

```shell
root@debian:~# docker images
REPOSITORY    TAG       IMAGE ID       CREATED         SIZE
hello-world   latest    feb5d9fea6a5   10 months ago   13.3kB

#解释
REPOSITORY  镜像的仓库源
TAG         镜像的标签
IMAGE ID    镜像的id
CREATED     镜像的创建时间
SIZE        镜像的大小

#可选向
  -a, --all             列出所有镜像
      --digests         格式化
  -f, --filter filter   过滤
      --format string   Pretty-print images using a Go template
      --no-trunc        Don't truncate output
  -q, --quiet           只显示id

```



***docker search 搜索镜像***

```shell
root@debian:~# docker search mysql
NAME                            DESCRIPTION                                     STARS     OFFICIAL   AUTOMATED
mysql                           MySQL is a widely used, open-source relation…   12986     [OK]       
mariadb                         MariaDB Server is a high performing open sou…   4974      [OK]       
phpmyadmin                      phpMyAdmin - A web interface for MySQL and M…   594       [OK]     

# 可选项
-f, --filter filter   Filter output based on conditions provided
      --format string   Pretty-print search using a Go template
      --limit int       Max number of search results (default 25)
      --no-trunc        Don't truncate output
      
 --filter=STARS=3000   # 搜索出来的stars大于3000

```

***docker pull 下载镜像***

```shell
# 下载镜像 docker pull 镜像名[:tag]
root@debian:~# docker pull mysql
Using default tag: latest  # 如果不写tag 默认最新版
latest: Pulling from library/mysql
32c1bf40aba1: Pull complete  #分层下载 docker images 核心
3ac22f3a638d: Pull complete 
b1e7273ed05e: Pull complete 
20be45a0c6ab: Pull complete 
410a229693ff: Pull complete 
1ce71e3a9b88: Pull complete  
c93c823af05b: Downloading [==================================>                ]  33.06MB/47.73MB # 下载真慢
c6752c4d09c7: Download complete 
d7f2cfe3efcb: Downloading [=====================================>             ]  30.17MB/40.03MB
916f32cb0394: Download complete 
0d62a5f9a14f: Download complete
Digest: sha256:ce2ae3bd3e9f001435c4671cf073d1d5ae55d138b16927268474fc54ba09ed79
Status: Downloaded newer image for mysql:latest
docker.io/library/mysql:latest 
#下载结束后会有一个真实地址


#指定版本下载
docker pull mysql:5.7
root@debian:~# docker pull mysql:5.7
5.7: Pulling from library/mysql
66fb34780033: Pull complete
ef4ccd63cdb4: Pull complete
d6f28a94c51f: Pull complete
7feea2a503b5: Pull complete
71dd5852ecd9: Pull complete
2ff5c3b24fd5: Pull complete
88a546386a61: Pull complete
65b18297cf83: Pull complete
d64f23335fb8: Pull complete
6ba4171261fa: Pull complete
96dcc6c8de93: Pull complete
Digest: sha256:b3a86578a582617214477d91e47e850f9e18df0b5d1644fb2d96d91a340b8972
Status: Downloaded newer image for mysql:5.7
docker.io/library/mysql:5.7



```


docker换源

```shell
Ubuntu16.04+、Debian8+、CentOS7
对于使用 systemd 的系统，请在 /etc/docker/daemon.json 中写入如下内容（如果文件不存在请新建该文件）：

{"registry-mirrors":["https://hub-mirror.c.163.com"]}
之后重新启动服务：

$ sudo systemctl daemon-reload
$ sudo systemctl restart docker
```





docker rmi -f 删除镜像

```shell
docker rmi -f [:id] #根据id删除
docker rmi -f [:id] [:id] [:id] #删除多个镜像
docker rmi -f $(docker images -aq)  #删除全部
```



### 容器命令

说明： 有了镜像才可以创建容器，linux 下载一个centos/或者debian镜像学习

```she
docker pull debain 
```

新建容器并使用

```shell
docker run [可选参数] image

# 参数说明
--name="name"  容器名字，用来区分容器
-d             后台方式运行
-it            使用交互式方式运行，进入容器查看内容
-p             指定容器端口 -p 8080:8080  
-P             随机指定端口

#测试 ,启动并进入主机
root@debian:~# docker run -it debian /bin/bash  
root@84afd5a2347c:/# ls
bin  boot  dev  etc  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
# 从容器进入主机
root@84afd5a2347c:/# exit
exit
root@debian:~# ls
echo
root@debian:~#

# 后台运行
docker run -itd --name debian-test debian /bin/bash

```

***列出所有的运行的容器***

```shell
root@debian:~# docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
root@debian:~# docker ps -a # 列出当前正在运行的容器+带出历史运行的容器
CONTAINER ID   IMAGE         COMMAND       CREATED         STATUS                     PORTS     NAMES
84afd5a2347c   debian        "/bin/bash"   3 minutes ago   Exited (0) 2 minutes ago             brave_poincare
69a873c09f8f   hello-world   "/hello"      31 hours ago    Exited (0) 31 hours ago              gifted_kalam
root@debian:~# ^C
root@debian:~# docker ps -a -n=1 # 列出最近创建的一个容器
CONTAINER ID   IMAGE     COMMAND       CREATED         STATUS                     PORTS     NAMES
84afd5a2347c   debian    "/bin/bash"   5 minutes ago   Exited (0) 5 minutes ago             brave_poincare
root@debian:~#
root@debian:~# docker ps -aq #只显示容器编号
84afd5a2347c
69a873c09f8f
root@debian:~#
```

**退出容器**

```shell
exit # 退出容器并停止
Ctrl + p + q # 不停止退出
root@debian:~# docker run -it debian /bin/bash
root@536db2a912c5:/# docker ps
bash: docker: command not found
root@536db2a912c5:/# root@debian:~# docker ps
CONTAINER ID   IMAGE     COMMAND       CREATED              STATUS              PORTS     NAMES
536db2a912c5   debian    "/bin/bash"   About a minute ago   Up About a minute             hardcore_blackwell
root@debian:~#

```

删除容器

```shell
docker rm 容器id # 不能删除正在运行的容器 强制删除 rm -f

```



***停止和启动容器***

```shell
docker start 容器id    #启动
docker restart 容器id  #重启
docker stop 容器id     #停止
docker kill 容器id     #杀掉
```

***进入正在进行的容器***

```shell
docker attach

docker exec # 推荐使用 docker exec 命令，因为此命令会退出容器终端，但不会导致容器的停止。

# docker attach a3df8363fb41 
# docker exec -it a3df8363fb41 /bin/bash
```



### 其他常用命令

***后台启动***

```shell
docker run -d

# docker容器后台运行 如果没有前台进程，就会自杀
```

查看日志

```shell
docker logs
#显示日志
-tf 
-- tail number # 要显示的条数
```

***查看容器进程信息***

```shell
docker top 容器id
```



***查看镜像元数据***

```shell
docker inspect 容器id
```

***从容器拷贝文件到主机***

```shell
docker cp 容器id:目标文件路径 文件要放的路径
```

nginx示例

```shell
docker run -d --name nginx01 -p 3344:80 nginx
# 3344 是主机端口 80 是镜像端口
```

### commit 镜像

```shell
docker commit -m="提交的描述信息" -a="作者" 容器id 目标镜像名:[tag]
```

查看镜像详情

```SHELL
docker inspect 容器id
```



### 容器数据卷

***什么是容器数据卷***

*docker*

将应用和环境打包成一个镜像！

数据？如果数据都在容器中，那么容器删除，数据都会丢失！ 需求：数据可以持久化。

MySQL，容器删了 = 删库跑路！需求：MySQL数据可以存储在本地！

容器之间有一个数据库共享技术！docker容器中产生的数据，同步到本地。

这就是卷技术！目录的挂载，将我们的容器目录挂载到linux上面

**总结一句话： 容器的持久化和同步操作！ 容器间也可以数据共享的！ **

### 使用数据卷

> 方式1: 直接使用命令挂载 -v

docker run -it -v 主机目录：容器目录

```shell
docker inspect 容器id #查看容器详情信息
"Mounts": [                               # 挂载
            {
                "Type": "bind",
                "Source": "/home/ceshi",  #主机内地址
                "Destination": "/home",   #docker容器内地址
                "Mode": "",
                "RW": true,
                "Propagation": "rprivate"
            }
        ],

```

### 实战 安装MySQL

```shell
获取MySQL 略
#运行容器数据需要挂载 # 安装启动mysql ，需要配置密码 这点要注意
#官方测试文档 $ docker run --name some-mysql -e MYSQL_ROOT_PASSWORD=my-secret-pw -d mysql:tag
#实战命令docker run -d -p 3306:3306 -v /home/mysql/conf:/etc/mysql/conf.d -v /home/mysql/data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=123456  --name mysql01 mysql:5.7
测试连接：
```

![image-20220814231332919](C:\Users\oikaze\AppData\Roaming\Typora\typora-user-images\image-20220814231332919.png)



### dockerFile

dockerFile 是用来构建docker镜像的文件。



### 构建过程

***基础知识***

1，每个保留关键字(指令)都必须是大写字母

2，执行从上到下顺序执行的

3，#表示注释

4，每一个指令都会创建提交一个新的镜像层，并提交



### 指令

```shell
FROM               #基础镜像， 一切从这里开始
MAINTAINER         #镜像是谁写的，姓名加邮箱
RUN                #镜像构建的时候需要运行的命令
ADD                #步骤：tomcat镜像，下颌骨tomcat压缩包！添加内容
WORKDIR            #镜像的工作目录
VOLUME             #挂载的目录
EXPOSE             #保留端口配置
CMD                #指定这个容器启动时侯要运行的命令，只有最后一个会生效，可被替代
ENTRYPOINT         #功能是启动时的默认命令，可以追加命令
ONBUILD            #当构建一个被继承dockerfile这个时候就会运行ONBUILD 的指令。触发命令
ENV                #构建的时候设置化境变量
```



![查看源图像](https://ts1.cn.mm.bing.net/th/id/R-C.7e554c8e9afda05e73075785c958c3b1?rik=pVLDhGgoiug4pQ&riu=http%3a%2f%2fstatic.gitlib.com%2fblog%2f2017%2f10%2f27%2fdocker2.jpg&ehk=rX%2fmx8o28le1zNp8NyBbI9liiVAlptu%2btk4SJQp84kw%3d&risl=&pid=ImgRaw&r=0&sres=1&sresct=1)



***实战测试***



```shell
#dockerhub 上的镜像脚本
#dockerhub 中99%的镜像都是 FROM scratch
FROM scratch
ADD rootfs.tar.xz /
CMD ["bash"]
```

> 创建一个自己的bebian

```shell

FROM debian
MAINTAINER oik<15093959810@163.com>

ENV MYPATH /user/local

WORKDIR $MYPATH

RUN apt-get install vim
RUN apt-get install nano
RUN apt-get install net-tools

EXPOSE 80

CMD echo $MYPATH
CMD echo "---end---"
CMD /bin/bash

# 运行
root@debian:/home/dockerfile# docker build -f mydockerfile-debian -t mydebian:0.1 .
Sending build context to Docker daemon  2.048kB
Step 1/11 : FROM debian
 ---> 07d9246c53a6
Step 2/11 : MAINTAINER oik<15093959810@163.com>
 ---> Running in f74c6228e919
Removing intermediate container f74c6228e919
 ---> b41a8470b584
Step 3/11 : ENV MYPATH /user/local
 ---> Running in 3ea74dd00af4
Removing intermediate container 3ea74dd00af4
 ---> be5aaeb3a759
Step 4/11 : WORKDIR $MYPATH
 ---> Running in f9d2b74696d6
Removing intermediate container f9d2b74696d6
 ---> fd82031d0e1a
Step 5/11 : RUN apt-get install vim
 ---> Running in 579b9961f040
Reading package lists...
Building dependency tree...
Reading state information...
E: Unable to locate package vim
The command '/bin/sh -c apt-get install vim' returned a non-zero code: 100 
root@debian:/home/dockerfile#

#加上apt update 也不太行

FROM debian
MAINTAINER oik<15093959810@163.com>

ENV MYPATH /usr/local

WORKDIR $MYPATH

RUN sed -i "s@http://deb.debian.org@http://mirrors.aliyun.com@g" /etc/apt/sources.list
RUN cat /etc/apt/sources.list
RUN rm -Rf /var/lib/apt/lists/*

RUN apt-get update \
    && apt-get install nano -y \
    && apt-get install net-tools -y

EXPOSE 80

CMD echo $MYPATH
CMD echo "---end---"
CMD /bin/bash

root@debian:/home/dockerfile# docker build -f mydockerfile-debian -t mydebian:0.6 .
Sending build context to Docker daemon  2.048kB
Step 1/12 : FROM debian
 ---> 07d9246c53a6
Step 2/12 : MAINTAINER oik<15093959810@163.com>
 ---> Using cache
 ---> b41a8470b584
Step 3/12 : ENV MYPATH /user/local
 ---> Using cache
 ---> be5aaeb3a759
Step 4/12 : WORKDIR $MYPATH
 ---> Using cache
 ---> fd82031d0e1a
Step 5/12 : RUN sed -i "s@http://deb.debian.org@http://mirrors.aliyun.com@g" /etc/apt/sources.list
 ---> Running in 05054ecc6fd3
Removing intermediate container 05054ecc6fd3
 ---> ffd23be7c6aa
Step 6/12 : RUN cat /etc/apt/sources.list
 ---> Running in 83afb121f2fb
# deb http://snapshot.debian.org/archive/debian/20220801T000000Z bullseye main
deb http://mirrors.aliyun.com/debian bullseye main
# deb http://snapshot.debian.org/archive/debian-security/20220801T000000Z bullseye-security main
deb http://mirrors.aliyun.com/debian-security bullseye-security main
# deb http://snapshot.debian.org/archive/debian/20220801T000000Z bullseye-updates main
deb http://mirrors.aliyun.com/debian bullseye-updates main
Removing intermediate container 83afb121f2fb
 ---> ce8f3d492a49
Step 7/12 : RUN rm -Rf /var/lib/apt/lists/*
 ---> Running in 35a57c09a4f4
Removing intermediate container 35a57c09a4f4
 ---> 2bb8bb78b818
Step 8/12 : RUN apt-get update     && apt-get install nano     && apt-get install net-tools
 ---> Running in 40e7373c02f8
Get:1 http://mirrors.aliyun.com/debian bullseye InRelease [116 kB]
Get:2 http://mirrors.aliyun.com/debian-security bullseye-security InRelease [48.4 kB]
Get:3 http://mirrors.aliyun.com/debian bullseye-updates InRelease [44.1 kB]
Get:4 http://mirrors.aliyun.com/debian bullseye/main amd64 Packages [8182 kB]
Get:5 http://mirrors.aliyun.com/debian-security bullseye-security/main amd64 Packages [175 kB]
Get:6 http://mirrors.aliyun.com/debian bullseye-updates/main amd64 Packages [2592 B]
Fetched 8567 kB in 16s (527 kB/s)
Reading package lists...
Reading package lists...
Building dependency tree...
Reading state information...
The following additional packages will be installed:
  libgpm2 libncursesw6
Suggested packages:
  gpm hunspell
The following NEW packages will be installed:
  libgpm2 libncursesw6 nano
0 upgraded, 3 newly installed, 0 to remove and 3 not upgraded.
Need to get 824 kB of archives.
After this operation, 3087 kB of additional disk space will be used.
Do you want to continue? [Y/n] Abort.
The command '/bin/sh -c apt-get update     && apt-get install nano     && apt-get install net-tools' returne                                                                                                  d a non-zero code: 1
root@debian:/home/dockerfile# nano mydockerfile-debian
root@debian:/home/dockerfile# docker build -f mydockerfile-debian -t mydebian:0.7 .
Sending build context to Docker daemon  2.048kB
Step 1/12 : FROM debian
 ---> 07d9246c53a6
Step 2/12 : MAINTAINER oik<15093959810@163.com>
 ---> Using cache
 ---> b41a8470b584
Step 3/12 : ENV MYPATH /user/local
 ---> Using cache
 ---> be5aaeb3a759
Step 4/12 : WORKDIR $MYPATH
 ---> Using cache
 ---> fd82031d0e1a
Step 5/12 : RUN sed -i "s@http://deb.debian.org@http://mirrors.aliyun.com@g" /etc/apt/sources.list
 ---> Using cache
 ---> ffd23be7c6aa
Step 6/12 : RUN cat /etc/apt/sources.list
 ---> Using cache
 ---> ce8f3d492a49
Step 7/12 : RUN rm -Rf /var/lib/apt/lists/*
 ---> Using cache
 ---> 2bb8bb78b818
Step 8/12 : RUN apt-get update     && apt-get install nano -y     && apt-get install net-tools -y
 ---> Running in d86b2713d11c
Get:1 http://mirrors.aliyun.com/debian bullseye InRelease [116 kB]
Get:2 http://mirrors.aliyun.com/debian-security bullseye-security InRelease [48.4 kB]
Get:3 http://mirrors.aliyun.com/debian bullseye-updates InRelease [44.1 kB]
Get:4 http://mirrors.aliyun.com/debian bullseye/main amd64 Packages [8182 kB]
Get:5 http://mirrors.aliyun.com/debian-security bullseye-security/main amd64 Packages [175 kB]
Get:6 http://mirrors.aliyun.com/debian bullseye-updates/main amd64 Packages [2592 B]
Fetched 8567 kB in 17s (504 kB/s)
Reading package lists...
Reading package lists...
Building dependency tree...
Reading state information...
The following additional packages will be installed:
  libgpm2 libncursesw6
Suggested packages:
  gpm hunspell
The following NEW packages will be installed:
  libgpm2 libncursesw6 nano
0 upgraded, 3 newly installed, 0 to remove and 3 not upgraded.
Need to get 824 kB of archives.
After this operation, 3087 kB of additional disk space will be used.
Get:1 http://mirrors.aliyun.com/debian bullseye/main amd64 libncursesw6 amd64 6.2+20201114-2 [132 kB]
Get:2 http://mirrors.aliyun.com/debian bullseye/main amd64 nano amd64 5.4-2+deb11u1 [656 kB]
Get:3 http://mirrors.aliyun.com/debian bullseye/main amd64 libgpm2 amd64 1.20.7-8 [35.6 kB]
debconf: delaying package configuration, since apt-utils is not installed
Fetched 824 kB in 2s (419 kB/s)
Selecting previously unselected package libncursesw6:amd64.
(Reading database ... 6661 files and directories currently installed.)
Preparing to unpack .../libncursesw6_6.2+20201114-2_amd64.deb ...
Unpacking libncursesw6:amd64 (6.2+20201114-2) ...
Selecting previously unselected package nano.
Preparing to unpack .../nano_5.4-2+deb11u1_amd64.deb ...
Unpacking nano (5.4-2+deb11u1) ...
Selecting previously unselected package libgpm2:amd64.
Preparing to unpack .../libgpm2_1.20.7-8_amd64.deb ...
Unpacking libgpm2:amd64 (1.20.7-8) ...
Setting up libgpm2:amd64 (1.20.7-8) ...
Setting up libncursesw6:amd64 (6.2+20201114-2) ...
Setting up nano (5.4-2+deb11u1) ...
update-alternatives: using /bin/nano to provide /usr/bin/editor (editor) in auto mode
update-alternatives: using /bin/nano to provide /usr/bin/pico (pico) in auto mode
Processing triggers for libc-bin (2.31-13+deb11u3) ...
Reading package lists...
Building dependency tree...
Reading state information...
The following NEW packages will be installed:
  net-tools
0 upgraded, 1 newly installed, 0 to remove and 3 not upgraded.
Need to get 250 kB of archives.
After this operation, 1015 kB of additional disk space will be used.
Get:1 http://mirrors.aliyun.com/debian bullseye/main amd64 net-tools amd64 1.60+git20181103.0eebece-1 [250 kB]
debconf: delaying package configuration, since apt-utils is not installed
Fetched 250 kB in 1s (457 kB/s)
Selecting previously unselected package net-tools.
(Reading database ... 6783 files and directories currently installed.)
Preparing to unpack .../net-tools_1.60+git20181103.0eebece-1_amd64.deb ...
Unpacking net-tools (1.60+git20181103.0eebece-1) ...
Setting up net-tools (1.60+git20181103.0eebece-1) ...
Removing intermediate container d86b2713d11c
 ---> f09e3d721c5b
Step 9/12 : EXPOSE 80
 ---> Running in 1dc0a2547ecf
Removing intermediate container 1dc0a2547ecf
 ---> 3a67115adac2
Step 10/12 : CMD echo $MYPATH
 ---> Running in 8fb76d1ac6c1
Removing intermediate container 8fb76d1ac6c1
 ---> f3799ac44ee0
Step 11/12 : CMD echo "---end---"
 ---> Running in e3d12791dc80
Removing intermediate container e3d12791dc80
 ---> 1e9b37f67cec
Step 12/12 : CMD /bin/bash
 ---> Running in b52dfc9dd37b
Removing intermediate container b52dfc9dd37b
 ---> 75e93ebddd31
Successfully built 75e93ebddd31
Successfully tagged mydebian:0.7

# 。。。。。
root@debian:/home/dockerfile# docker images
REPOSITORY    TAG       IMAGE ID       CREATED              SIZE
mydebian      0.7       75e93ebddd31   About a minute ago   147MB
<none>        <none>    af8e4cc38320   7 minutes ago        124MB
mysql         latest    7b94cda7ffc7   11 days ago          446MB
tomcat        latest    81ffce3265f0   12 days ago          475MB
nginx         latest    b692a91e4e15   13 days ago          142MB
debian        latest    07d9246c53a6   13 days ago          124MB
mysql         5.7       3147495b3a5c   2 weeks ago          431MB
hello-world   latest    feb5d9fea6a5   10 months ago        13.3kB
root@debian:/home/dockerfile#


root@debian:/home/dockerfile# docker run -itd --name mydebian-tset  mydebian:0.7
ef05583fbe716057fbe5c8469b27a2249bcc96dafda90d098904fe3574d3eef3
root@debian:/home/dockerfile# docker ps
CONTAINER ID   IMAGE          COMMAND                  CREATED          STATUS          PORTS     NAMES
ef05583fbe71   mydebian:0.7   "/bin/sh -c /bin/bash"   45 seconds ago   Up 43 seconds   80/tcp    mydebian-tset


root@debian:/home/dockerfile# docker exec -it ef05583fbe71 /bin/bash
root@ef05583fbe71:/user/local# pwd
/user/local
root@ef05583fbe71:/user/local# ifconfig
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 172.17.0.2  netmask 255.255.0.0  broadcast 172.17.255.255
        ether 02:42:ac:11:00:02  txqueuelen 0  (Ethernet)
        RX packets 13  bytes 1086 (1.0 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 0  bytes 0 (0.0 B)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

root@ef05583fbe71:/user/local#



```

> tomcat 镜像

```shell
root@debian:~/home/oik# cat Dockerfile
FROM debian
MAINTAINER oik<15093959810@163.com>

COPY readme.txt /usr/local/readme.txt

ADD jdk-8u341-linux-x64.tar.gz /usr/local/
ADD apache-tomcat-10.0.23.tar.gz /usr/local/

RUN sed -i "s@http://deb.debian.org@http://mirrors.aliyun.com@g" /etc/apt/sources.list
RUN cat /etc/apt/sources.list
RUN rm -Rf /var/lib/apt/lists/*

RUN apt-get update \
    && apt-get install nano -y \
    && apt-get install net-tools -y

ENV MYPATH /usr/local

WORKDIR $MYPATH

ENV JAVA_HOME /usr/local/jdk1.8.0_341
ENV CLASSPATH $JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar
ENV CATALINA_HOME /usr/local/apache-tomcat-10.0.23
ENV CATALINA_BASH /usr/local/apache-tomcat-10.0.23
ENV PATH $PATH:$JAVA_HOME/bin:$CATALINA_HOME/lib:$CATALINA_BASH/bin

EXPOSE 8080

CMD /usr/local/apache-tomcat-10.0.23/bin/startup.sh && tail -F /usr/local/apache-tomcat-10.0.23/bin/logs/cataline.out

root@debian:~/home/oik# docker build -t diytomcat .
Sending build context to Docker daemon  160.1MB
Step 1/18 : FROM debian
 ---> 07d9246c53a6
Step 2/18 : MAINTAINER oik<15093959810@163.com>
 ---> Using cache
 ---> b41a8470b584
Step 3/18 : COPY readme.txt /usr/local/readme.txt
 ---> 93842bc8cdb2
Step 4/18 : ADD jdk-8u341-linux-x64.tar.gz /usr/local/
 ---> a3c0b960a698
Step 5/18 : ADD apache-tomcat-10.0.23.tar.gz /usr/local/
 ---> 51afb2acbbfe
Step 6/18 : RUN sed -i "s@http://deb.debian.org@http://mirrors.aliyun.com@g" /etc/apt/sources.list
 ---> Running in 112c67c088da
Removing intermediate container 112c67c088da
 ---> ea7dcd595378
Step 7/18 : RUN cat /etc/apt/sources.list
 ---> Running in 472e583b42cb
# deb http://snapshot.debian.org/archive/debian/20220801T000000Z bullseye main
deb http://mirrors.aliyun.com/debian bullseye main
# deb http://snapshot.debian.org/archive/debian-security/20220801T000000Z bullseye-security main
deb http://mirrors.aliyun.com/debian-security bullseye-security main
# deb http://snapshot.debian.org/archive/debian/20220801T000000Z bullseye-updates main
deb http://mirrors.aliyun.com/debian bullseye-updates main
Removing intermediate container 472e583b42cb
 ---> d1e58cbca9fb
Step 8/18 : RUN rm -Rf /var/lib/apt/lists/*
 ---> Running in ed5d9bf3bc04
Removing intermediate container ed5d9bf3bc04
 ---> 2a934fe038d5
Step 9/18 : RUN apt-get update     && apt-get install nano -y     && apt-get install net-tools -y
 ---> Running in cd6ef9540a98
Get:1 http://mirrors.aliyun.com/debian bullseye InRelease [116 kB]
Get:2 http://mirrors.aliyun.com/debian-security bullseye-security InRelease [48.4 kB]
Get:3 http://mirrors.aliyun.com/debian bullseye-updates InRelease [44.1 kB]
Get:4 http://mirrors.aliyun.com/debian bullseye/main amd64 Packages [8182 kB]
Get:5 http://mirrors.aliyun.com/debian-security bullseye-security/main amd64 Packages [176 kB]
Get:6 http://mirrors.aliyun.com/debian bullseye-updates/main amd64 Packages [2592 B]
Fetched 8569 kB in 2s (4084 kB/s)
Reading package lists...
Reading package lists...
Building dependency tree...
Reading state information...
The following additional packages will be installed:
  libgpm2 libncursesw6
Suggested packages:
  gpm hunspell
The following NEW packages will be installed:
  libgpm2 libncursesw6 nano
0 upgraded, 3 newly installed, 0 to remove and 3 not upgraded.
Need to get 824 kB of archives.
After this operation, 3087 kB of additional disk space will be used.
Get:1 http://mirrors.aliyun.com/debian bullseye/main amd64 libncursesw6 amd64 6.2+20201114-2 [132 kB]
Get:2 http://mirrors.aliyun.com/debian bullseye/main amd64 nano amd64 5.4-2+deb11u1 [656 kB]
Get:3 http://mirrors.aliyun.com/debian bullseye/main amd64 libgpm2 amd64 1.20.7-8 [35.6 kB]
debconf: delaying package configuration, since apt-utils is not installed
Fetched 824 kB in 1s (1330 kB/s)
Selecting previously unselected package libncursesw6:amd64.
(Reading database ... 6661 files and directories currently installed.)
Preparing to unpack .../libncursesw6_6.2+20201114-2_amd64.deb ...
Unpacking libncursesw6:amd64 (6.2+20201114-2) ...
Selecting previously unselected package nano.
Preparing to unpack .../nano_5.4-2+deb11u1_amd64.deb ...
Unpacking nano (5.4-2+deb11u1) ...
Selecting previously unselected package libgpm2:amd64.
Preparing to unpack .../libgpm2_1.20.7-8_amd64.deb ...
Unpacking libgpm2:amd64 (1.20.7-8) ...
Setting up libgpm2:amd64 (1.20.7-8) ...
Setting up libncursesw6:amd64 (6.2+20201114-2) ...
Setting up nano (5.4-2+deb11u1) ...
update-alternatives: using /bin/nano to provide /usr/bin/editor (editor) in auto mode
update-alternatives: using /bin/nano to provide /usr/bin/pico (pico) in auto mode
Processing triggers for libc-bin (2.31-13+deb11u3) ...
Reading package lists...
Building dependency tree...
Reading state information...
The following NEW packages will be installed:
  net-tools
0 upgraded, 1 newly installed, 0 to remove and 3 not upgraded.
Need to get 250 kB of archives.
After this operation, 1015 kB of additional disk space will be used.
Get:1 http://mirrors.aliyun.com/debian bullseye/main amd64 net-tools amd64 1.60+git20181103.0eebece-1 [250 kB]
debconf: delaying package configuration, since apt-utils is not installed
Fetched 250 kB in 0s (1223 kB/s)
Selecting previously unselected package net-tools.
(Reading database ... 6783 files and directories currently installed.)
Preparing to unpack .../net-tools_1.60+git20181103.0eebece-1_amd64.deb ...
Unpacking net-tools (1.60+git20181103.0eebece-1) ...
Setting up net-tools (1.60+git20181103.0eebece-1) ...
Removing intermediate container cd6ef9540a98
 ---> 0d7019de5cd8
Step 10/18 : ENV MYPATH /usr/local
 ---> Running in 89d9ac09de52
Removing intermediate container 89d9ac09de52
 ---> b8ce3c1a604f
Step 11/18 : WORKDIR $MYPATH
 ---> Running in 18c6999f3dba
Removing intermediate container 18c6999f3dba
 ---> 2d61301ae0ed
Step 12/18 : ENV JAVA_HOME /usr/local/jdk1.8.0_341
 ---> Running in 2606d44d0f36
Removing intermediate container 2606d44d0f36
 ---> ff617b11d105
Step 13/18 : ENV CLASSPATH $JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar
 ---> Running in 17db990c54c0
Removing intermediate container 17db990c54c0
 ---> 0609280e5050
Step 14/18 : ENV CATALINA_HOME /usr/local/apache-tomcat-10.0.23
 ---> Running in a0015aafba1c
Removing intermediate container a0015aafba1c
 ---> 16da0d9c0d4f
Step 15/18 : ENV CATALINA_BASH /usr/local/apache-tomcat-10.0.23
 ---> Running in 713030e7263a
Removing intermediate container 713030e7263a
 ---> 3c28a73734fb
Step 16/18 : ENV PATH $PATH:$JAVA_HOME/bin:$CATALINA_HOME/lib:$CATALINA_BASH/bin
 ---> Running in da6c55df03f9
Removing intermediate container da6c55df03f9
 ---> be85fa6f38dc
Step 17/18 : EXPOSE 8080
 ---> Running in 333a3b6d1c6b
Removing intermediate container 333a3b6d1c6b
 ---> a548a63edbe0
Step 18/18 : CMD /usr/local/apache-tomcat-10.0.23/bin/startup.sh && tail -F /usr/local/apache-tomcat-10.0.23/bin/logs/cataline.out
 ---> Running in 9841ef9d7096
Removing intermediate container 9841ef9d7096
 ---> 7aab2997e32d
Successfully built 7aab2997e32d
Successfully tagged diytomcat:latest
root@debian:~/home/oik#

```

启动挂载

```shell
docker run -d -p 9090:8080 --name mytomcat -v /root/home/oik/build/tomcat/test:/usr/local/apache-tomcat-10.0.23/webapps/ -v /root/home/oik/build/tomcat/tomcatlogs/:/usr/local/apache-tomcat-10.0.23/logs diytomcat

```

在主机目录/root/home/oik/build/tomcat/test

```shell
root@debian:~/home/oik/build/tomcat/test# mkdir test
root@debian:~/home/oik/build/tomcat/test# cd test/
root@debian:~/home/oik/build/tomcat/test/test# cd WEB-INF/
root@debian:~/home/oik/build/tomcat/test/test/WEB-INF# cat web.xml
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee
                http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd" id="WebApp_ID" version="4.0">

</web-app>
root@debian:~/home/oik/build/tomcat/test/test/WEB-INF# cd ..
root@debian:~/home/oik/build/tomcat/test/test# nano index.jsp
root@debian:~/home/oik/build/tomcat/test/test# cat index.jsp
<%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>hello</title>
</head>
<body>
Hello World!<br/>
<%
System.out.println("---test tomcat----");
%>
</body>
</html>

```

访问 http://192.168.1.138:9090/test/

![image-20220817002917930](C:\Users\oikaze\AppData\Roaming\Typora\typora-user-images\image-20220817002917930.png)

看看日志

```shell
root@debian:~/home/oik/build/tomcat/tomcatlogs# cat catalina.out
16-Aug-2022 16:04:56.433 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Server version name:   Apache Tomcat/10.0.23
16-Aug-2022 16:04:56.435 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Server built:          Jul 14 2022 08:16:11 UTC
16-Aug-2022 16:04:56.435 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Server version number: 10.0.23.0
16-Aug-2022 16:04:56.435 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log OS Name:               Linux
16-Aug-2022 16:04:56.435 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log OS Version:            5.10.0-16-amd64
16-Aug-2022 16:04:56.435 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Architecture:          amd64
16-Aug-2022 16:04:56.435 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Java Home:             /usr/local/jdk1.8.0_341/jre
16-Aug-2022 16:04:56.436 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log JVM Version:           1.8.0_341-b10
16-Aug-2022 16:04:56.436 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log JVM Vendor:            Oracle Corporation
16-Aug-2022 16:04:56.436 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log CATALINA_BASE:         /usr/local/apache-tomcat-10.0.23
16-Aug-2022 16:04:56.436 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log CATALINA_HOME:         /usr/local/apache-tomcat-10.0.23
16-Aug-2022 16:04:56.441 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Djava.util.logging.config.file=/usr/local/apache-tomcat-10.0.23/conf/logging.properties
16-Aug-2022 16:04:56.441 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager
16-Aug-2022 16:04:56.441 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Djdk.tls.ephemeralDHKeySize=2048
16-Aug-2022 16:04:56.441 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Djava.protocol.handler.pkgs=org.apache.catalina.webresources
16-Aug-2022 16:04:56.442 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Dorg.apache.catalina.security.SecurityListener.UMASK=0027
16-Aug-2022 16:04:56.442 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Dignore.endorsed.dirs=
16-Aug-2022 16:04:56.442 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Dcatalina.base=/usr/local/apache-tomcat-10.0.23
16-Aug-2022 16:04:56.442 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Dcatalina.home=/usr/local/apache-tomcat-10.0.23
16-Aug-2022 16:04:56.442 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Djava.io.tmpdir=/usr/local/apache-tomcat-10.0.23/temp
16-Aug-2022 16:04:56.443 INFO [main] org.apache.catalina.core.AprLifecycleListener.lifecycleEvent The Apache Tomcat Native library which allows using OpenSSL was not found on the java.library.path: [/usr/java/packages/lib/amd64:/usr/lib64:/lib64:/lib:/usr/lib]
16-Aug-2022 16:04:56.849 INFO [main] org.apache.coyote.AbstractProtocol.init Initializing ProtocolHandler ["http-nio-8080"]
16-Aug-2022 16:04:56.868 INFO [main] org.apache.catalina.startup.Catalina.load Server initialization in [589] milliseconds
16-Aug-2022 16:04:56.891 INFO [main] org.apache.catalina.core.StandardService.startInternal Starting service [Catalina]
16-Aug-2022 16:04:56.891 INFO [main] org.apache.catalina.core.StandardEngine.startInternal Starting Servlet engine: [Apache Tomcat/10.0.23]
16-Aug-2022 16:04:56.907 INFO [main] org.apache.coyote.AbstractProtocol.start Starting ProtocolHandler ["http-nio-8080"]
16-Aug-2022 16:04:56.926 INFO [main] org.apache.catalina.startup.Catalina.start Server startup in [57] milliseconds
16-Aug-2022 16:18:11.585 INFO [Catalina-utility-1] org.apache.catalina.startup.HostConfig.deployDirectory Deploying web application directory [/usr/local/apache-tomcat-10.0.23/webapps/test]
16-Aug-2022 16:18:11.846 INFO [Catalina-utility-1] org.apache.catalina.startup.HostConfig.deployDirectory Deployment of web application directory [/usr/local/apache-tomcat-10.0.23/webapps/test] has finished in [260] ms
16-Aug-2022 16:18:51.882 INFO [Catalina-utility-2] org.apache.catalina.startup.HostConfig.reload Reloading context [/test]
16-Aug-2022 16:18:51.882 INFO [Catalina-utility-2] org.apache.catalina.core.StandardContext.reload Reloading Context with name [/test] has started
16-Aug-2022 16:18:51.926 INFO [Catalina-utility-2] org.apache.catalina.core.StandardContext.reload Reloading Context with name [/test] is completed
---test tomcat----
root@debian:~/home/oik/build/tomcat/tomcatlogs#

```

