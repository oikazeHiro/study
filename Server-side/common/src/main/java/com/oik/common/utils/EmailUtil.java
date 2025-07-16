package com.oik.common.utils;

import com.oik.common.config.StudyProperty;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.mail.*;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import java.util.Properties;

@Slf4j
@Component
public class EmailUtil {

    @Resource
    private StudyProperty studyProperty;

    public void sendEmail(String title,String body, String toEmail){
        Properties props = new Properties();
        props.put("mail.smtp.host", studyProperty.getEmail().getHost());          // 设置SMTP服务器
        props.put("mail.smtp.auth", "true");        // 需要认证
        props.put("mail.smtp.port", "465");         // SSL端口
        props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
        props.put("mail.smtp.socketFactory.port", "465");
        String form = studyProperty.getEmail().getForm();
        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(form
                        , studyProperty.getEmail().getPassword());
            }
        });
        try {
            Message message = new MimeMessage(session);

            // 设置发件人
            message.setFrom(new InternetAddress(form));

            // 设置收件人
            message.setRecipient(Message.RecipientType.TO, new InternetAddress(toEmail));

            // 设置邮件主题
            message.setSubject(title);

            // 设置邮件正文
            message.setText(body);
            Transport.send(message);
            log.error("sendMailMsg回调发送邮件成功，接收人: {}",toEmail);
        } catch (MessagingException e) {
            log.error("sendMailMsg回调发送邮件失败，接收人: {} \n 详情： {}",toEmail,e.getMessage());
        }
    }
}
