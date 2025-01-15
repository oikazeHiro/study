# linux
[toc]

## 脚本

生成一个300m的test文件
> #!/bin/sh
> echo '密码' | sudo -S dd if=/dev/urandom of=test bs=30M count=10

杀掉一个端口为8085的程序
> #!/bin/sh
> sudo kill -9 $(sudo lsof -t -i:8085)

以外部配置文件启动jar包并长时间挂载，并把日志输出到ceic.log，并将密码输入
> #!/bin/sh
> echo '密码' | sudo nohup java -jar /home/easygoing/jarweb/ceicceshi/wsxt.jar --spring.config.location=/home/easygoing/jarweb/ceicceshi/application-development.yml > /home/easygoing/jarweb/ceicceshi/ceic.log 2>&1 &

查看jar进程
> ps aux | grep xxx.jar
> ps -ef | grep java

定时任务
> /etc/crontab
>编辑： crontab -e
> 每2个小时执行一次脚本 0 */2 * * * /test/test.sh
> sudo service cron restart 重启crontab服务
> crontab -i 查看定时任务
> crontab -r 停止删除所有定时任务
> systemctl status crond.service 查看cron服务的启动状态
> systemctl start crond.service 启动cron服务[命令没有提示]
> systemctl stop crond.service 停止cron服务[命令没有提示]
> systemctl restart crond.service 重启cron服务[命令没有提示]
> systemctl reload crond.service 重新加载cron服务[命令没有提示]
> tail -f -n 200 /var/log/cron 查看cron执行日志

> 修改~/.bashrc ll在这个里面

> ssh拒绝密码
> 修改 /etc/ssh/sshd_config
> 将PermitRootLogin no改成PermitRootLogin yes


#### Linux系统的文件结构

/bin        二进制文件，系统常规命令
/boot       系统启动分区，系统启动时读取的文件
/dev        设备文件
/etc        大多数配置文件
/home       普通用户的家目录
/lib        32位函数库
/lib64      64位库
/media      手动临时挂载点
/mnt        手动临时挂载点
/opt        第三方软件安装位置
/proc       进程信息及硬件信息
/root       临时设备的默认挂载点
/sbin       系统管理命令
/srv        数据
/var        数据
/sys        内核相关信息
/tmp        临时文件
/usr        用户相关设定

#### 帮助命令（help）

  ifconfig  --help     //查看 ifconfig 命令的用法

#### 切换目录（cd）

  cd /                 //切换到根目录
  cd /bin              //切换到根目录下的bin目录
  cd ../               //切换到上一级目录 或者使用命令：cd ..
  cd ~                 //切换到home目录
  cd -                 //切换到上次访问的目录
  cd xx(文件夹名)       //切换到本目录下的名为xx的文件目录，如果目录不存在报错
  cd /xxx/xx/x         //可以输入完整的路径，直接切换到目标目录，输入过程中可以使用tab键快速补全

#### 创建目录（mkdir）

 mkdir tools          //在当前目录下创建一个名为tools的目录
  mkdir /bin/tools     //在指定目录下创建一个名为tools的目录

#### 删除目录与文件（rm）

  rm 文件名              //删除当前目录下的文件
  rm -f 文件名           //删除当前目录的的文件（不询问）
  rm -r 文件夹名         //递归删除当前目录下此名的目录
  rm -rf 文件夹名        //递归删除当前目录下此名的目录（不询问）
  rm -rf *              //将当前目录下的所有目录和文件全部删除
  rm -rf /*             //将根目录下的所有文件全部删除【慎用！相当于格式化系统】

#### 修改目录（mv）

 mv 当前目录名 新目录名        //修改目录名，同样适用与文件操作
  mv /usr/tmp/tool /opt       //将/usr/tmp目录下的tool目录剪切到 /opt目录下面
  mv -r /usr/tmp/tool /opt    //递归剪切目录中所有文件和文件夹

#### 拷贝目录（cp）

  cp /usr/tmp/tool /opt       //将/usr/tmp目录下的tool目录复制到 /opt目录下面
  cp -r /usr/tmp/tool /opt    //递归剪复制目录中所有文件和文件夹

#### 搜索目录（find）

  find /bin -name 'a*'        //查找/bin目录下的所有以a开头的文件或者目录

#### 查看当前目录（pwd）

  pwd                         //显示当前位置路径

#### 新增文件（touch）

   touch  a.txt         //在当前目录下创建名为a的txt文件（文件不存在），如果文件存在，将文件时间属性修改为当前系统时间

#### 查看文件

  cat a.txt          //查看文件最后一屏内容
  less a.txt         //PgUp向上翻页，PgDn向下翻页，"q"退出查看
  more a.txt         //显示百分比，回车查看下一行，空格查看下一页，"q"退出查看
  tail -100 a.txt    //查看文件的后100行，"Ctrl+C"退出查看

#### 打包与解压

  .zip、.rar        //windows系统中压缩文件的扩展名
  .tar              //Linux中打包文件的扩展名
  .gz               //Linux中压缩文件的扩展名
  .tar.gz           //Linux中打包并压缩文件的扩展名

> 打包文件

  tar -zcvf 打包压缩后的文件名 要打包的文件
  参数说明：z：调用gzip压缩命令进行压缩; c：打包文件; v：显示运行过程; f：指定文件名;
  示例：
  tar -zcvf a.tar file1 file2,...      //多个文件压缩打包

> 解压文件

  tar -zxvf a.tar                      //解包至当前目录
  tar -zxvf a.tar -C /usr------        //指定解压的位置
  unzip test.zip             //解压*.zip文件 
  unzip -l test.zip          //查看*.zip文件的内容 

#### 其他常用命令

> grep

  grep -i "the" demo_file              //在文件中查找字符串(不区分大小写)
  grep -A 3 -i "example" demo_text     //输出成功匹配的行，以及该行之后的三行
  grep -r "ramesh" *                   //在一个文件夹中递归查询包含指定字符串的文件

> service

  说明：service命令用于运行System V init脚本，这些脚本一般位于/etc/init.d文件下，这个命令可以直接运行这个文件夹里面的脚本，而不用加上路径
  service ssh status      //查看服务状态 
  service --status-all    //查看所有服务状态 
  service ssh restart     //重启服务 

> free

  说明：这个命令用于显示系统当前内存的使用情况，包括已用内存、可用内存和交换内存的情况 
  free -g            //以G为单位输出内存的使用量，-g为GB，-m为MB，-k为KB，-b为字节 
  free -t            //查看所有内存的汇总

> top

  top               //显示当前系统中占用资源最多的一些进程, shift+m 按照内存大小查看

> yum

  说明：安装插件命令
  yum install httpd      //使用yum安装apache 
  yum update httpd       //更新apache 
  yum remove httpd       //卸载/删除apache 


> rpm

  说明：插件安装命令
  rpm -ivh httpd-2.2.3-22.0.1.el5.i386.rpm      //使用rpm文件安装apache 
  rpm -uvh httpd-2.2.3-22.0.1.el5.i386.rpm      //使用rpm更新apache 
  rpm -ev httpd                                 //卸载/删除apache 

 #### 防火墙操作

  service iptables status      //查看iptables服务的状态
  service iptables start       //开启iptables服务
  service iptables stop        //停止iptables服务
  service iptables restart     //重启iptables服务
  chkconfig iptables off       //关闭iptables服务的开机自启动
  chkconfig iptables on        //开启iptables服务的开机自启动
  ##centos7 防火墙操作
  systemctl status firewalld.service     //查看防火墙状态
  systemctl stop firewalld.service       //关闭运行的防火墙
  systemctl disable firewalld.service    //永久禁止防火墙服务


> 修改IP

修改网络配置文件，文件地址：/etc/sysconfig/network-scripts/ifcfg-eth0

  主要修改以下配置：  
  TYPE=Ethernet               //网络类型
  BOOTPROTO=static            //静态IP
  DEVICE=ens00                //网卡名
  IPADDR=192.168.1.100        //设置的IP
  NETMASK=255.255.255.0       //子网掩码
  GATEWAY=192.168.1.1         //网关
  DNS1=192.168.1.1            //DNS
  DNS2=8.8.8.8                //备用DNS
  ONBOOT=yes                  //系统启动时启动此设置

  修改保存以后使用命令重启网卡：service network restart

#### 查看进程

  ps -ef         //查看所有正在运行的进程

#### 结束进程

  kill pid       //杀死该pid的进程
  kill -9 pid    //强制杀死该进程   

#### 安装docker
官方文档：

先决条件
要成功安装 Docker Desktop，您必须：

满足系统要求。
拥有 64 位版本的 Debian 11。
卸载 Docker Desktop for Linux 的技术预览版或 beta 版。
 > sudo apt remove docker-desktop
 
要彻底清理，请删除位于 的配置和数据文件$HOME/.docker/desktop、位于 的符号链接/usr/local/bin/com.docker.cli，并清除剩余的 systemd 服务文件。

>  rm -r $HOME/.docker/desktop
 sudo rm /usr/local/bin/com.docker.cli
 sudo apt purge docker-desktop
笔记

>如果您已经安装了 Docker Desktop for Linux 技术预览版或 beta 版，您需要删除由这些软件包生成的所有文件（例如~/.config/systemd/user/docker-desktop.service、~/.local/share/systemd/user/docker-desktop.service）。

对于 Gnome 桌面环境，您还必须安装 AppIndicator 和 KStatusNotifierItem Gnome 扩展。

对于非 Gnome 桌面环境，gnome-terminal必须安装：

 > sudo apt install gnome-terminal
 
安装 Docker 桌面
在 Debian 上安装 Docker Desktop 的推荐方法：

设置Docker 的包存储库。

下载最新的DEB 包。

使用 apt 安装软件包，如下所示：

> sudo apt-get update
 sudo apt-get install ./docker-desktop-<version>-<arch>.deb

> 错误笔记： docker compose version
docker: 'compose' is not a docker command.
运行  apt-get install docker-compose-plugin

上面没仔细看文档 巨坑


网上的教程：
安装基础工具


> sudo apt-get update
 sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
    
2. 安装docker的gpg key：

> curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

3. 安装docker源

> echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
上面命令中的lsb_release -cs返回bullseye，也就是debian11的代号。

4. 安装docker

>apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io
至此安装完成。

在debian系的Linux发行版上，docker会开机启动启动。

如果平时使用非root账户，又不想每次执行docker命令之前都加上sudo，参考docker的文档，可以添加docker组，并将非root账户加入到该组中。下面的命令创建docker组并将当前用户加入docker组，执行完成之后重新登陆生效：

>sudo groupadd docker
sudo usermod -aG docker $USER

#### 安装nginx

默认会有安装：

        sudo apt-get install nginx

更新：

        apt-get update

        apt-get install nginx

服务启动与停止：

        sudo systemctl stop nginx

        sudo systemctl start nginx

        sudo systemctl restart nginx

        sudo systemctl reload nginx

服务设置是否自启动：

        sudo systemctl disable nginx

        sudo systemctl enable nginx

查看服务是否启动：

         ps -ef | grep nginx / ps aux | grep

查看服务的状态：

        systemctl status nginx

nginx的默认配置：

> ‘–conf-path=/etc/nginx/nginx.conf’, #配置文件路径，默认是conf/nginx
‘–error-log-path=/var/log/nginx/error.log’, #错误日志路径，默认是/logs/error.log
‘–http-client-body-temp-path=/var/lib/nginx/body’, #指定http客户端请求缓存文件存放目录的路径
‘–http-fastcgi-temp-path=/var/lib/nginx/fastcgi’, #指定http FastCGI缓存文件存放目录的路径
‘–http-log-path=/var/log/nginx/access.log’, #指定http默认访问日志的路径
‘–http-proxy-temp-path=/var/lib/nginx/proxy’, #指定http反向代理缓存文件存放目录
‘–http-scgi-temp-path=/var/lib/nginx/scgi’, #指定http sigi缓存文件存放目录的路径
‘–http-uwsgi-temp-path=/var/lib/nginx/uwsgi’, #指定http uwsgi缓存文件存放目录的路径
‘–lock-path=/var/lock/nginx.lock’, # 指定nginx.lock文件的路径
‘–pid-path=/var/run/nginx.pid’, # 指定nginx.pid文件的路径，默认是/logs/nginx.pid
‘–with-debug’, #启用调试日志
‘–with-http_addition_module’, #启用http_addition_module
‘–with-http_dav_module’, #启用http_dav_module
‘–with-http_geoip_module’,
‘–with-http_gzip_static_module’,
‘–with-http_image_filter_module’,
‘–with-http_realip_module’,
‘–with-http_stub_status_module’,
‘–with-http_ssl_module’,
‘–with-http_sub_module’,
‘–with-http_xslt_module’,
‘–with-ipv6’,
‘–with-sha1=/usr/include/openssl’,
‘–with-md5=/usr/include/openssl’,
‘–with-mail’,
‘–with-mail_ssl_module’,
‘–add-module=/build/buildd/nginx-0.8.54/debian/modules/nginx-upstream-fair’
 
安装完成后Nginx所使用的目录如下
> /usr/sbin/nginx
/usr/share/nginx
/usr/share/doc/nginx
/etc/nginx
/etc/init.d/nginx
/etc/default/nginx
/etc/logrotate.d/nginx
/etc/ufw/applications.d/nginx
/var/lib/nginx
/var/lib/update-rc.d/nginx
/var/log/nginx
 
网站文件可以放就在 /usr/share/nginx/www下.具体情况需要查看响应的配置文件

网站配置文件： 

         默认目录：/etc/nginx/sites-available

        在此配置文件中配置和修改网站目录及域名等等信息

站点配置：

> Nginx服务器阻止文件或站点配置文件存储在“/etc/nginx/sites-available /”目录中。要使这些文件在Nginx上使用，请将文件链接到“/etc/nginx/sites-enable/”目录中。
要激活任何新的站点配置，我们需要在“sites-available”目录中创建到“sites-enabled”目录的站点配置文件的符号链接。
要标识站点的配置，请遵循服务器阻止文件的标准命名转换。例如，您有一个网站a5idc.net。最好将文件创建为“/etc/nginx/sites-available/a5idc.net.conf”，以便在Nginx Web服务器中配置了多个站点时快速识别。
解决或调试错误最重要的文件称为日志文件。在“/var/log/nginx”目录中生成的Nginx日志文件（access.log和error.log）。如果每个服务器块都有不同的访问和错误日​​志文件，则对于调试很有用。
配置域文档的根目录没有限制，您可以设置任何所需的位置。但是，对于Web根目录，最推荐的位置是：
/home/<user>/<site-name>
/var/www/<site-name>
/var/www/html/<site-name>
/opt/<site-name>
        1、配置多个配置文件，作为每一个网站的单独配置文件，当然只是用系统默认提供的基础上修改也可以：配置目录/etc/nginx/sites-available

        例如： /etc/nginx/sites-available/limonero

        limonero文件内容：与default类似，只需要在器基础上配置自己的域名、端口和网站文件村饭的目录即可,端口后面的default_server 需要注释掉

        2、建立软链接：建立在site-enabled中

                sudo ln -s /etc/nginx/sites-available/limonero  /etc/nginx/sites-enabled/

                修改配置之后需要重新建立软链接

#### 安装openjdk8

首先，更新软件包列表并安装通过HTTPS添加新存储库所需的依赖项，命令如下：

> sudo apt-get update
sudo apt install apt-transport-https ca-certificates wget dirmngr gnupg software-properties-common

其次，使用wget命令导入存储库的GPG密钥(该网址国内可能不能直接访问)：

> wget -qO - https://adoptopenjdk.jfrog.io/adoptopenjdk/api/gpg/key/public | sudo apt-key add -

添加AdoptOpenJDK APT存储库到你的系统：

> sudo add-apt-repository --yes https://adoptopenjdk.jfrog.io/adoptopenjdk/deb/

更新apt源软件列表，启用存储库，安装OpenJDK 8

> sudo apt update
sudo apt install adoptopenjdk-8-hotspot

在命令行终端中输入如下命令，检查安装结果。

> java -version

如果之前系统上安装了其他版本的JDK，系统默认显示的依旧为之前版本信息，只是后需要通过命令来显示Java版本列表，并选择某一个作为系统默认版本的Java。

>sudo update-alternatives --config java

输出列表如下：

> [linux265@debian:~$ sudo update-alternatives --config java

有 2 个候选项可用于替换 java (提供 /usr/bin/java)。

  选择       路径                                              优先级  状态
------------------------------------------------------------
* 0            /usr/lib/jvm/java-11-openjdk-amd64/bin/java          1111      自动模式
  1            /usr/lib/jvm/adoptopenjdk-8-hotspot-amd64/bin/java   1081      手动模式
  2            /usr/lib/jvm/java-11-openjdk-amd64/bin/java          1111      手动模式

要维持当前值[*]请按<回车键>，或者键入选择的编号：
输入编号1然后回车，这是OpenJDK 8 就为当前默认版本，在此输入java -version查看输出，如下：

openjdk version "1.8.0_222"
OpenJDK Runtime Environment (AdoptOpenJDK)(build 1.8.0_222-b10)
OpenJDK 64-Bit Server VM (AdoptOpenJDK)(build 25.222-b10, mixed mode)
至此，OpenJDK 8 (LTS) 安装完成。

卸载已安装Open JDK
只要是通过apt方式安装软件，你都可以通过apt命令卸载这些软件。所以，卸载OpenJDK也是一样。

例如，要卸载default-jdk包，只需运行：

sudo apt remove default-jdk
要卸载刚刚安装的OpenJDK 8，可以通过如下命令：

sudo apt remove adoptopenjdk-8-hotspot

#### 虚拟机ip address 变成127.0.0.1 

dhclient 命令配置网络接口参数
> dhclient -v

查看端口监听
> netstat -nap | grep 端口

查看硬盘
> df -h

查看内存
> free -m

查看cpu占用
> top -bn 1 -i -c

%us：表示用户空间程序的cpu使用率（没有通过nice调度）

%sy：表示系统空间的cpu使用率，主要是内核程序。

%ni：表示用户空间且通过nice调度过的程序的cpu使用率。

%id：空闲cpu

%wa：cpu运行时在等待io的时间

%hi：cpu处理硬中断的数量

%si：cpu处理软中断的数量

%st：被虚拟机偷走的cpu