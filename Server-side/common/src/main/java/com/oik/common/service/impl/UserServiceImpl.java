package com.oik.common.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.oik.common.mapper.UserMapper;
import com.oik.common.base.User;
import com.oik.common.service.UserService;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
* @author 15093
* @description 针对表【user】的数据库操作Service实现
* @createDate 2025-05-30 16:31:15
*/
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService , UserDetailsService {

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return null;
    }
}




