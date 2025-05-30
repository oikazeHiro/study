package com.oik;

import com.oik.common.utils.Encrypt;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.io.File;

@SpringBootTest()
@ActiveProfiles("test")
class AppApplicationTests {

    @Resource
    private SysUserService sysUserService;

    @Resource
    private PasswordEncoder passwordEncoder;

    @Test
    void contextLoads() {
        String url ="jdbc:mysql://127.0.0.1:3306/study?useSSL=false&serverTimezone=UTC&characterEncoding=utf-8&useSSL=false&allowPublicKeyRetrieval=true";
        String user = "root";
        String password = "icui4cu";
        System.out.println(Encrypt.encrypt(url, "wdzOW5StfLCDwwyW"));
        System.out.println(Encrypt.encrypt(user, "wdzOW5StfLCDwwyW"));
        System.out.println(Encrypt.encrypt(password, "wdzOW5StfLCDwwyW"));
    }

    @Test
    void randomKey(){
        System.out.println(Encrypt.randomKey());
        System.out.println(new File(System.getProperty("user.dir")).getParent());
    }

    @Test
    void userTest(){
        sysUserService.list().forEach(System.out::println);
    }

    @Test
    void passwordTest(){
        System.out.println(passwordEncoder.encode("123456"));
    }

}
