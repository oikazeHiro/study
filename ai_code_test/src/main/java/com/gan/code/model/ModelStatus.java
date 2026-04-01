package com.gan.code.model;

public enum ModelStatus {
    NORMAL("normal", "正常"),
    DELETED("deleted", "删除"),
    HIDDEN("hidden", "隐藏")

    ;
    private String status;
    private String description;
    private ModelStatus(String status, String description) {
        this.status = status;
        this.description = description;
    }
    public String getStatus() {
        return status;
    }
    public String getDescription() {
        return description;
    }
}
