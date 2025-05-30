package com.oik.common.base;


import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

import java.util.Date;

/**
 * @TableName user
 */
@TableName(value = "user")
@Data
public class User extends AuditEntityBean implements Serializable {

    /**
     * 用户ID
     */
    @TableId("user_id")
    private Long userId;
    /**
     * 登录账号
     */

    @TableField("username")
    private String username;
    /**
     * 加密密码
     */
    @TableField("password_hash")
    private String passwordHash;
    /**
     * 真实姓名
     */
    @TableField("realname")
    private String realname;
    /**
     * 电子邮箱
     */
    @TableField("email")
    private String email;
    /**
     * 手机号码
     */
    @TableField("mobile")
    private String mobile;
    /**
     * 所属部门
     */
    @TableField("department_id")
    private Long departmentId;
    /**
     * 是否锁定
     */
    @TableField("is_locked")
    private Integer isLocked;

}
