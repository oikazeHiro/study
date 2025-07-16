package com.oik.common.utils;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.concurrent.TimeUnit;

/**
 * 分布式锁增强版
 */
@Component
public class RedisLockUtil {
    private final RedisTemplate<String, Object> redisTemplate;

    public RedisLockUtil(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 加锁
     *
     * @param lockKey       锁key
     * @param requestId     请求ID
     * @param expireTime    过期时间(秒)
     * @param waitTime      等待时间(秒)
     * @param retryInterval 重试间隔(毫秒)
     * @return 是否加锁成功
     */
    public boolean lock(String lockKey, String requestId, long expireTime,
                        long waitTime, long retryInterval) {
        long start = System.currentTimeMillis();
        try {
            while (true) {
                // 尝试获取锁
                if (redisTemplate.opsForValue().setIfAbsent(
                        lockKey, requestId, expireTime, TimeUnit.SECONDS)) {
                    return true;
                }

                // 检查是否超时
                if (System.currentTimeMillis() - start > waitTime * 1000) {
                    return false;
                }

                // 等待重试
                Thread.sleep(retryInterval);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 释放锁(Lua脚本保证原子性)
     */
    public boolean unlock(String lockKey, String requestId) {
        String script = "if redis.call('get', KEYS[1]) == ARGV[1] then " +
                "return redis.call('del', KEYS[1]) " +
                "else return 0 end";

        DefaultRedisScript<Long> redisScript = new DefaultRedisScript<>();
        redisScript.setScriptText(script);
        redisScript.setResultType(Long.class);

        Long result = redisTemplate.execute(redisScript,
                Collections.singletonList(lockKey),
                requestId);
        return result != null && result == 1;
    }


}
