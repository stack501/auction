const passport = require("passport");
const bcrypt = require('bcrypt');
const { Strategy: LocalStorage } = require('passport-local');
const User = require("../models/user");

module.exports = () => {
    passport.use(new LocalStorage({
        usernameField: 'email', //req.body.email
        passwordField: 'password',  //req.body.password
        passReqToCallback: false,   //async (req, email, password, done) req를 넣을지말지 여부
    }, async (email, password, done) => {
        try {
            const exUser = await User.findOne({ where: { email } });
            if(exUser) {
                const isResult = await bcrypt.compare(password, exUser.password);
                if(isResult) {
                    done(null, exUser);
                } else {
                    done(null, false, { message : '비밀번호가 일치하지 않습니다.' });
                }
            } else {
                done(null, false, { message : '가입하지 않은 회원입니다.' });
            }
        } catch (error) {
            console.error(error);
            done(error);
        }
    }));
};