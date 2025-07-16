package com.oik.common.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.oik.common.base.AuthUser;

import java.util.Optional;

/**
* @author 15093
* @description 针对表【user】的数据库操作Service
* @createDate 2025-05-30 16:31:15
*/
public interface UserService extends IService<AuthUser> {

    Optional<AuthUser> findByUsername(String username);
}
