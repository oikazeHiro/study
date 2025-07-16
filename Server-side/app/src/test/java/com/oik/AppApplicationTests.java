package com.oik;

import com.oik.common.utils.Encrypt;
import com.oik.common.utils.MD5Utils;
import com.oik.common.utils.EmailUtil;
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
    void passwordTest(){
        String number = "nuct888";
        String s = MD5Utils.md5Upper(number);
        System.out.println(s);
//        String encode = passwordEncoder.encode(s);
//        System.out.println(encode);
//        boolean matches = passwordEncoder.matches(s, encode);
//        System.out.println(matches);
    }


    @Resource
    private EmailUtil emailUtil;
    @Test
    void sendEmail(){
        String to = "2889295938@qq.com";
        emailUtil.sendEmail("来自望天长叹帅", "测试", to);
    }

}
