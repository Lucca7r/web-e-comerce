const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { User, createUser, getUserByEmail, getUserByUserName } = require('../models/User');
const { Product, getProductByProductId } = require('../models/Product');
const jwt = require('jsonwebtoken');
const upload = require('../middlewares/upload');

router.post('/registro', upload.single('imagem'), [
    body('userName').notEmpty().withMessage('Nome de usuário é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
    body('dataNascimento').isISO8601().withMessage('Data de nascimento inválida (formato ISO 8601)'),
    body('telefone').isMobilePhone().withMessage('Número de telefone inválido')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userName, password, email, dataNascimento, telefone } = req.body;
    const imageUrl = req.file ? req.file.path : null;

    try {
        // Verificar se o email já existe
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        const existingUserName = await getUserByUserName(userName);
        if (existingUserName) {
            return res.status(400).json({ error: 'Nome de usuário já cadastrado' });
        }

        // Criar o usuário
        const user = await createUser(userName, password, email, dataNascimento, telefone, imageUrl);
        res.status(201).json({ message: 'Usuário criado com sucesso', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

router.post('/login', async (req, res) => {
    const { userName, password, rememberMe } = req.body;

    try {
        const user = await getUserByUserName(userName);
        if (!user) {
            return res.status(400).json({ error: 'Usuário não encontrado' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Senha inválida' });
        }

        // Gerar um token JWT
        const token = jwt.sign({ userId: user.userName }, 'seu_segredo_jwt', { expiresIn: '1h' });

        if (rememberMe) {
            res.cookie('jwt', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 dias
        }

        res.status(200).json({ message: 'Login bem-sucedido', token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

router.get('/user/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await getUserByUserName(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

router.get('/product/:id', async (req, res) => {
    const productId = req.params.id;


    try {
        const product = await getProductByProductId(productId);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        res.status(200).json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
});

module.exports = router;
