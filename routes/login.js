'use strict';

var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

var SEED = require('../config/config').SEED;

var app = express();

var Usuario = require('../models/usuario');

var GOOGLE_CLIENT_ID = require('../config/config').GOOGLE_CLIENT_ID; 
var GOOGLE_SECRET  = require('../config/config').GOOGLE_SECRET;

var {OAuth2Client} = require('google-auth-library');
var client = new OAuth2Client(GOOGLE_CLIENT_ID,GOOGLE_SECRET, '');

const regeneratorRuntime = require("regenerator-runtime");


// =====================================================
// Autenticacion de Google
// =====================================================
app.post('/google', (req, res) => {

  var verify = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var ticket, payload, userid;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return client.verifyIdToken({
              idToken: token,
              audience: GOOGLE_CLIENT_ID
            });

          case 2:
            ticket = _context.sent;
            payload = ticket.getPayload();
            userid = payload['sub'];

            Usuario.findOne({ email: payload.email }, (err, usuario) => {

              if (err) {
                return res.status(500).json({
                  ok: true,
                  mensaje: 'Error al buscar usuario - login',
                  errors: err
                });
              }

              if (usuario) {

                if ( usuario.google === false ) {
                  return res.status(400).json({
                    ok: true,
                    mensaje: 'Debe de usar su Autenticacion normal',
                    errors: err
                  });
                }else{

                    usuario.password = ':)';
                    
                    var token = jwt.sign({ usuario: usuario }, SEED , { expiresIn: 14400 }); // 4 horas

                    res.status(200).json({
                      ok: true,
                      usuario: usuario,
                      token: token,
                      id: usuario._id
                    });
                }
                //Si el usuario no existe por correo
              } else {

                var usuario = new Usuario();

                usuario.nombre = payload.name;
                usuario.email = payload.email;
                usuario.password = ':D';
                usuario.img = payload.picture;
                usuario.google = true;

                usuario.save( (err, usuarioDB) => {

                  if (err) {
                    return res.status(500).json({
                      ok: true,
                      mensaje: 'Error al crear usuario - google',
                      errors: err
                    });
                  }

                  var token = jwt.sign({ usuario: usuarioDB }, SEED , { expiresIn: 14400 }); // 4 horas

                  res.status(200).json({
                    ok: true,
                    usuario: usuarioDB,
                    token: token,
                    id: usuarioDB._id
                  });

                });
              }

            });

          case 6:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

    return function verify() {
      return _ref.apply(this, arguments);
    };
  }();

  function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

  var token = req.body.token || 'XXX';

  verify().catch(console.error);

})


//LA VIDA NO ES FACIL PERO HAY QUE VIVIRLA
// =====================================================
// Autenticacion normal - https://documenter.getpostman.com/collection/view/1865307-3e8c46aa-9e3f-b950-1d85-a56b722a07e9#6ceb2b8b-fc9b-61b9-c28f-ef1fb8ef11f4
// =====================================================

app.post('/', ( req, res ) => {

  var body = req.body;

  Usuario.findOne({ email: body.email }, (err, usuarioDB) => {
 
    if (err) {
      return res.status(500).json({
        ok: false,
        mensaje: 'Error al buscar usuarios',
        errors: err
      });
    }

    if (!usuarioDB) {
      return res.status(400).json({
        ok: false,            //quitar en produccion el - email solo es para saber en que putno falla la verificacion
        mensaje: 'Credenciales incorrectas - email',
        errors: err
      });
    }

    if (!bcrypt.compareSync( body.password, usuarioDB.password )) {
      return res.status(400).json({
        ok: false,            
        mensaje: 'Credenciales incorrectas - password',
        errors: err
      });
    }

    // Crear un token!!!
    usuarioDB.password = ':)';
    
    var token = jwt.sign({ usuario: usuarioDB }, SEED , { expiresIn: 14400 }); // 4 horas

    res.status(200).json({
      ok: true,
      usuario: usuarioDB,
      token: token,
      id: usuarioDB._id
    });

  });

  

});


module.exports = app;