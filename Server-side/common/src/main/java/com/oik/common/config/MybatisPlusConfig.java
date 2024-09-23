package com.oik.common.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.BlockAttackInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.DataChangeRecorderInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.IllegalSQLInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MybatisPlusConfig {

    @Resource
    private StudyProperty studyProperty;

    /**
     * 配置MybatisPlus拦截器
     * <p>
     * 该方法创建并返回一个MybatisPlusInterceptor对象，并为其添加两个内部拦截器：
     * 1. PaginationInnerInterceptor：用于自动分页功能，根据配置的数据库类型优化分页查询；
     * 2. IllegalSQLInnerInterceptor：用于拦截非法SQL，增加SQL执行的安全性；
     * 3. DataChangeRecorderInnerInterceptor：用于记录数据变更，记录变更的数据库表、字段、旧值、新值等。
     * 4. BlockAttackInnerInterceptor：用于阻止全表更新和删除操作，防止误操作。
     *
     * @return MybatisPlusInterceptor 返回配置好的MybatisPlus拦截器实例
     */
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor(){
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.getDbType(studyProperty.getDbType())));
        interceptor.addInnerInterceptor(new IllegalSQLInnerInterceptor());
        DataChangeRecorderInnerInterceptor dataChangeRecorderInnerInterceptor = new DataChangeRecorderInnerInterceptor();
        dataChangeRecorderInnerInterceptor.setBatchUpdateLimit(1000);
        interceptor.addInnerInterceptor(dataChangeRecorderInnerInterceptor);
        interceptor.addInnerInterceptor(new BlockAttackInnerInterceptor());
        return interceptor;
    }

}
