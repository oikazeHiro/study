package com.oik.common.config.security;

import com.oik.common.utils.JwtAuthenticationEntryPoint;
import com.oik.common.utils.JwtRequestFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final JwtRequestFilter jwtRequestFilter;

    public SecurityConfig(JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint,
                          JwtRequestFilter jwtRequestFilter) {
        this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
        this.jwtRequestFilter = jwtRequestFilter;
    }

    /**
     * 配置Security过滤链
     * <p>
     * 该方法用于配置Spring Security的过滤链，以保护应用程序的资源
     * 它定义了哪些请求需要认证，登录和登出的规则，以及如何处理这些请求
     *
     * @param http HttpSecurity实例，用于配置Web安全
     * @return SecurityFilterChain对象，代表配置好的安全过滤链
     * @throws Exception 配置过程中可能抛出的异常
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 配置请求授权规则
                .authorizeHttpRequests(authorize -> authorize
                        // 允许任何人访问根路径和主页
                        .requestMatchers("/", "/home").permitAll()
                        // 其他所有请求都需要用户认证
                        .anyRequest().authenticated()
                )
                // 禁用跨域请求伪造（CSRF）保护，因为我们在无状态环境中工作
                .cors(csrf -> csrf.disable())
                // 配置异常处理
                .exceptionHandling(exception -> exception
                        // 设置未授权访问的入口点
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                )
                // 配置会话管理
                .sessionManagement(session -> session
                        // 设置会话创建策略为无状态，因为我们使用JWT进行身份验证
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                );
        // 在UsernamePasswordAuthenticationFilter之前添加JWT请求过滤器
        http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);
        // 构建并返回配置好的SecurityFilterChain
        return http.build();
    }


    /**
     * 配置并返回一个密码编码器实例
     * 该方法使用@Bean注解，表示将返回的对象作为Bean注入到Spring容器中
     * 这里选择BCryptPasswordEncoder作为密码编码器，因为它提供了一种安全的方式来处理用户密码
     * BCrypt是一种强大的哈希函数，适用于安全地存储密码
     *
     * @return PasswordEncoder接口的实现，用于对用户密码进行编码和比较
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    /**
     * 配置跨域资源共享(CORS)的Bean
     * 该方法定义了允许从哪些域对你的资源进行请求，以及允许哪些类型的HTTP请求
     *
     * @return CorsConfigurationSource 用于提供CORS配置的源
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        // 创建一个新的CORS配置实例
        CorsConfiguration configuration = new CorsConfiguration();
        // 设置允许访问的域名，此处仅允许从"https://example.com"进行跨域请求
        configuration.setAllowedOrigins(Arrays.asList("https://example.com"));
        // 设置允许的HTTP方法，包括GET、POST、PUT和DELETE
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE"));

        // 创建一个新的基于URL的CORS配置源
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // 将CORS配置注册到所有路径（"/**"表示匹配所有路径）
        source.registerCorsConfiguration("/**", configuration);

        // 返回配置好的CORS配置源
        return source;
    }


}
