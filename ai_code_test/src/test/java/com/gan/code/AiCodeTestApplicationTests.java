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
                TextContent.from("解析图片文字"),
                ImageContent.from("https://download.ydstatic.com/ead/zhiyun/guanwang_cdn_2019/images/p-ocr/cookbook100K.jpg")
        );
        String result = aiCodeHelper.chat(userMessage);
        System.out.println(result);
        assertNotNull( result,"");
    }
}
