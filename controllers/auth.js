const bcrypt = require('bcrypt');
const User = require("../models/user");
const passport = require('passport');

exports.join = async (req, res, next) => {
    const { nick, email, password, money } = req.body; //app.js 의 express.urlencoded에 의해 views - join의 form을 body에서 꺼내쓸 수 있음
    try {
        const exUser = await User.findOne({ where: { email } });
        if(exUser) {
            return res.redirect('/join?error=이미 가입된 이메일입니다.');
        }
        const hash = await bcrypt.hash(password, 12);
        await User.create({
            email,
            nick,
            password: hash,
            money,
        });
        return res.redirect('/');
    } catch (err) {
        console.error(err);
        next(err);
    }
}

//POST /auth/login
exports.login = (req, res, next) => {
    //두 번째 인자는 'passport - localStrategy.js의 done에서 온다.
    passport.authenticate('local', (authError, user, info) => {
        if(authError) { //서버 실패1
            console.error(authError);
            return next(authError);
        }

        if(!user) { //로직 실패
            return res.redirect(`/?loginError=${info.message}`);
        }

        return req.login(user, (loginError) => {
            if(loginError) {
                console.error(loginError);
                return next(loginError);
            }

            return res.redirect('/');
        });
    })(req, res, next);
}

exports.logout = (req, res, next) => {
    req.logout(() => {
        res.redirect('/');
    });
}