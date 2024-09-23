package com.oik.common.base;

import com.baomidou.mybatisplus.annotation.TableField;

import java.io.Serializable;
import java.time.LocalDateTime;

public class AuditEntityBean implements Serializable {
    @TableField(value = "created_by")
    private String createdBy;
    @TableField(value = "updated_by")
    private String updatedBy;
    @TableField(value = "created_time")
    private LocalDateTime createTime;
    @TableField(value = "updated_time")
    private LocalDateTime updateTime;
}
