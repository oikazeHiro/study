package com.oik.common.config;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "study")
@Getter
@Setter
public class StudyProperty {
    @NotNull
    private String dbType;
    private EmailProperty email;
    // 跳过验证 的 url
    private List<String> skipValidation;

    @Getter
    @Setter
    public static class EmailProperty {

        private String form;

        private String password;

        private String host;

        private String protocol;
    }
}
