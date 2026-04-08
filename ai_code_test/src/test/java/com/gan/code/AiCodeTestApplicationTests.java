package com.gan.code;

import com.gan.code.ai.AiCodeHelper;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class AiCodeTestApplicationTests {


    @Resource
    private AiCodeHelper aiCodeHelper;

    @Test
    void imageTest(){
        UserMessage userMessage = UserMessage.from(
                TextContent.from("解析图片,用中文回答"),
                ImageContent.from("https://c-ssl.duitang.com/uploads/blog/202308/22/aLS39xEet0Wx5oZ.jpg")
//                "你好"
        );
        String result = aiCodeHelper.chat(userMessage);
        System.out.println(result);
        assertNotNull( result,"");
    }
}
