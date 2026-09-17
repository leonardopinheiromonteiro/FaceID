/**
 * Entidade de Domínio para Empresas / Filiais
 */
class Branch {
    constructor({ code, name, cnpj = '', active = true, createdAt = new Date() }) {
        if (!code || typeof code !== 'string') {
            throw new Error('O código da filial é obrigatório.');
        }

        const cleanCode = code.trim();
        if (cleanCode.length > 10) {
            throw new Error('O código da filial deve ter no máximo 10 caracteres.');
        }

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error('O nome da filial é obrigatório.');
        }

        this.code = cleanCode;
        this.name = name.trim();
        this.cnpj = (cnpj || '').trim();
        this.active = active !== false;
        this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
    }

    toJSON() {
        return {
            code: this.code,
            name: this.name,
            cnpj: this.cnpj,
            active: this.active,
            createdAt: this.createdAt.toISOString()
        };
    }
}

module.exports = Branch;
