package com.oik.common.utils;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    /**
     * 当用户未通过身份验证时调用此方法发送错误响应
     *
     * @param request          当前的HTTP请求对象，提供请求的相关信息
     * @param response         当前的HTTP响应对象，用于发送响应到客户端
     * @param authException    身份验证异常，表示身份验证失败的原因
     *
     * @throws IOException 如果在发送错误响应过程中发生I/O错误
     */
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        // 发送401错误代码和"Unauthorized"消息到客户端
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
    }

}
