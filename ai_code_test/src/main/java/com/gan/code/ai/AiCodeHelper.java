package com.gan.code.ai;

import dev.langchain4j.model.chat.ChatModel;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class AiCodeHelper {

    @Resource
    private ChatModel chatModel;
}
