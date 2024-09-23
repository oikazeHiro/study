package com.oik.common.utils;

import com.baomidou.mybatisplus.core.toolkit.AES;

public class Encrypt {
    public static String randomKey(){
        return AES.generateRandomKey();
    }

    public static String encrypt(String data, String key){
        return AES.encrypt(data, key);
    }
}
