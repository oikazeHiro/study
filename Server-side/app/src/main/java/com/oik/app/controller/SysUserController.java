package com.oik.app.controller;

import com.oik.common.base.SysUser;
import com.oik.service.SysUserService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/user")
public class SysUserController {

    @Resource
    private SysUserService sysUserService;

    @RequestMapping("/list")
    public List<SysUser> list() {
        return sysUserService.list();
    }
}
