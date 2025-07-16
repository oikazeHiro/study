package com.oik.common.base;


import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * @TableName user
 */
@TableName(value = "user")
@Getter
@Setter
public class AuthUser extends User implements Serializable {

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
    @TableField(value = "created_by")
    private String createdBy;
    @TableField(value = "updated_by")
    private String updatedBy;
    @TableField(value = "created_time")
    private LocalDateTime createTime;
    @TableField(value = "updated_time")
    private LocalDateTime updateTime;

    public AuthUser(String username, String password, Collection<? extends GrantedAuthority> authorities) {
        super(username, password, authorities);
    }

    public List<Role> getRoles() {
        return new ArrayList<>();
    }
}
