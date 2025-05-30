package com.oik.common.utils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class MD5Utils {

    /**
     * 生成MD5哈希值（32位小写）
     */
    public static String md5(String input) {
        return hash(input, "MD5", false);
    }

    /**
     * 生成MD5哈希值（32位大写）
     */
    public static String md5Upper(String input) {
        return hash(input, "MD5", true);
    }

    /**
     * 通用哈希方法
     *
     * @param input     输入字符串
     * @param algorithm 算法名称（如MD5、SHA-1等）
     * @param toUpper   是否转为大写
     * @return 哈希值字符串
     */
    private static String hash(String input, String algorithm, boolean toUpper) {
        try {
            MessageDigest md = MessageDigest.getInstance(algorithm);
            byte[] hashBytes = md.digest(input.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }

            return toUpper ? hexString.toString().toUpperCase() : hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(algorithm + "算法不可用", e);
        }
    }

    /**
     * 加盐MD5加密
     *
     * @param input 原始字符串
     * @param salt  盐值
     * @return 加盐后的MD5值
     */
    public static String md5WithSalt(String input, String salt) {
        return md5(input + salt);
    }
}