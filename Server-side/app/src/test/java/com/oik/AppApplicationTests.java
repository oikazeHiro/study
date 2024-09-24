package com.oik;

import com.oik.common.utils.Encrypt;
import com.oik.service.SysUserService;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.io.File;

@SpringBootTest()
@ActiveProfiles("test")
class AppApplicationTests {

    @Resource
    private SysUserService sysUserService;

    @Test
    void contextLoads() {
        String url ="jdbc:mysql://118.25.183.36:3306/study?useSSL=false&serverTimezone=UTC&characterEncoding=utf-8&useSSL=false&allowPublicKeyRetrieval=true";
        System.out.println(Encrypt.encrypt("icui4cu", "wdzOW5StfLCDwwyW"));
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

}
