package com.oik.common.base;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@Getter
@Setter
@Accessors(chain = true)
@TableName("sys_user")
public class SysUser extends AuditEntityBean {
    @TableField("id")
    private String id;
    @TableField("username")
    private String username;
    @TableField("password")
    private String password;
    @TableField("name")
    private String name;
    @TableField("email")
    private String email;
    @TableField("phone")
    private String phone;
    @TableField("deleted")
    private String deleted;
}
