# linux
[toc]
### Linux 磁盘管理

Linux 磁盘管理常用三个命令为 df、du 和 fdisk。
- df（英文全称：disk free）：列出文件系统的整体磁盘使用量
- du（英文全称：disk used）：检查磁盘空间使用量
- fdisk：用于磁盘分区

#### df
df命令参数功能：检查文件系统的磁盘空间占用情况。可以利用该命令来获取硬盘被占用了多少空间，目前还剩下多少空间等信息。
语法：

> df [-ahikHTm] [目录或文件名]

选项与参数：
- a ：列出所有的文件系统，包括系统特有的 /proc 等文件系统；
- k ：以 KBytes 的容量显示各文件系统；
- m ：以 MBytes 的容量显示各文件系统；
- h ：以人们较易阅读的 GBytes, MBytes, KBytes 等格式自行显示；
- H ：以 M=1000K 取代 M=1024K 的进位方式；
- T ：显示文件系统类型, 连同该 partition 的 filesystem 名称 (例如 ext3) 也列出；
- i ：不用硬盘容量，而以 inode 的数量来显示

实例 1
将系统内所有的文件系统列出来
> [root@www ~]# df
> Filesystem      1K-blocks      Used Available Use% Mounted on
> /dev/hdc2         9920624   3823112   5585444  41% /
> /dev/hdc3         4956316    141376   4559108   4% /home
> /dev/hdc1          101086     11126     84741  12% /boot
> tmpfs              371332         0    371332   0% /dev/shm

在 Linux 底下如果 df 没有加任何选项，那么默认会将系统内所有的 (不含特殊内存内的文件系统与 swap) 都以 1 Kbytes 的容量来列出来

实例 2
将容量结果以易读的容量格式显示出来

> [root@www ~]# df -h
Filesystem            Size  Used Avail Use% Mounted on
/dev/hdc2             9.5G  3.7G  5.4G  41% /
/dev/hdc3             4.8G  139M  4.4G   4% /home
/dev/hdc1              99M   11M   83M  12% /boot
tmpfs                 363M     0  363M   0% /dev/shm

#### du
Linux du 命令也是查看使用空间的，但是与 df 命令不同的是 Linux du 命令是对文件和目录磁盘使用的空间的查看，还是和df命令有一些区别的
语法：

> du [-ahskm] 文件或目录名称

选项与参数：
- -a ：列出所有的文件与目录容量，因为默认仅统计目录底下的文件量而已。
- -h ：以人们较易读的容量格式 (G/M) 显示；
- -s ：列出总量而已，而不列出每个各别的目录占用容量；
- -S ：不包括子目录下的总计，与 -s 有点差别。
- -k ：以 KBytes 列出容量显示；
- -m ：以 MBytes 列出容量显示；

#### fdisk

fdisk 是 Linux 的磁盘分区表操作工具。
语法：

> fdisk [-l] 装置名称

选项与参数：

- -l ：输出后面接的装置所有的分区内容。若仅有 fdisk -l 时， 则系统将会把整个系统内能够搜寻到的装置的分区均列出来。

#### 磁盘格式化
磁盘分割完毕后自然就是要进行文件系统的格式化，格式化的命令非常的简单，使用 mkfs（make filesystem） 命令。
语法：

> mkfs [-t 文件系统格式] 装置文件名


#### 磁盘检验
fsck（file system check）用来检查和维护不一致的文件系统。
若系统掉电或磁盘发生问题，可利用fsck命令对文件系统进行检查。
语法：

> fsck [-t 文件系统] [-ACay] 装置名称

- -t : 给定档案系统的型式，若在 /etc/fstab 中已有定义或 kernel 本身已支援的则不需加上此参数
- -s : 依序一个一个地执行 fsck 的指令来检查
- -A : 对/etc/fstab 中所有列出来的 分区（partition）做检查
- -C : 显示完整的检查进度
- -d : 打印出 e2fsck 的 debug 结果
- -p : 同时有 -A 条件时，同时有多个 fsck 的检查一起执行
- -R : 同时有 -A 条件时，省略 / 不检查
- -V : 详细显示模式
- -a : 如果检查有错则自动修复
- -r : 如果检查有错则由使用者回答是否修复
- -y : 选项指定检测每个文件是自动输入yes，在不确定那些是不正常的时候，可以执行 # fsck -y 全部检查修复。


#### 磁盘挂载与卸除
Linux 的磁盘挂载使用 mount 命令，卸载使用 umount 命令。
磁盘挂载语法：

> mount [-t 文件系统] [-L Label名] [-o 额外选项] [-n]  装置文件名  挂载点

磁盘卸载命令 umount 语法：

> umount [-fn] 装置文件名或挂载点

选项与参数：

- -f ：强制卸除！可用在类似网络文件系统 (NFS) 无法读取到的情况下；
- -n ：不升级 /etc/mtab 情况下卸除

卸载/dev/hdc6

> [root@www ~]# umount /dev/hdc6  

### dd

if=文件名：输入文件名，默认为标准输入。即指定源文件。
of=文件名：输出文件名，默认为标准输出。即指定目的文件。
ibs=bytes：一次读入bytes个字节，即指定一个块大小为bytes个字节。
obs=bytes：一次输出bytes个字节，即指定一个块大小为bytes个字节。
bs=bytes：同时设置读入/输出的块大小为bytes个字节。
cbs=bytes：一次转换bytes个字节，即指定转换缓冲区大小。
skip=blocks：从输入文件开头跳过blocks个块后再开始复制。
seek=blocks：从输出文件开头跳过blocks个块后再开始复制。
count=blocks：仅拷贝blocks个块，块大小等于ibs指定的字节数。

> conv=<关键字>，关键字可以有以下11种：
conversion：用指定的参数转换文件。
ascii：转换ebcdic为ascii
ebcdic：转换ascii为ebcdic
ibm：转换ascii为alternate ebcdic
block：把每一行转换为长度为cbs，不足部分用空格填充
unblock：使每一行的长度都为cbs，不足部分用空格填充
lcase：把大写字符转换为小写字符
ucase：把小写字符转换为大写字符
swap：交换输入的每对字节
noerror：出错时不停止
notrunc：不截短输出文件
sync：将每个输入块填充到ibs个字节，不足部分用空（NUL）字符补齐。

--help：显示帮助信息
--version：显示版本信息
