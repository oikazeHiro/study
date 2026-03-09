package com.gan.code.ai;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class AiCodeHelper {

    @Resource
    private ChatModel chatModel;

    public String chat(UserMessage message){
        ChatResponse chatResponse = chatModel.chat(message);
        AiMessage aiMessage = chatResponse.aiMessage();
        return aiMessage.text();
    }
}
