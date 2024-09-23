package com.oik;

import com.oik.common.utils.Encrypt;
import com.oik.service.SysUserService;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest()
@TestPropertySource(locations = "classpath:application-dev.yml")
class AppApplicationTests {

    @Resource
    private SysUserService sysUserService;

    @Test
    void contextLoads() {
        System.out.println(Encrypt.encrypt("icui4cu", "Zs81y4PpLSSxcLwO"));
    }

    @Test
    void randomKey(){
        System.out.println(Encrypt.randomKey());
    }

    @Test
    void userTest(){
        sysUserService.list().forEach(System.out::println);
    }

}
