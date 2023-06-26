const express = require("express");
const {v4: uuidv4} = require("uuid");

const app = express();

app.use(express.json());

const customers = [];
/**
 * dados necessarios para aplicação
 * cpf - string
 * name - string
 * id - uuid
 * statement - [array]
 */

//middleware para testar se o cpf é valido
function verifyIfExistsAccountCPF(request, response, next) {
    const { cpf } = request.headers;
    
      /**
     * procura se existe algum customer com o cpf igual ao cpf que foi passado
     */
    const customer = customers.find((customer) => customer.cpf === cpf)

        /**
     * Verificando se o cpf no qual está buscando o extrato existe
     */
         if(!customer) {
            return response.status(400).json({ error: "Customer not found" });
        }

        request.customer = customer;
    
        return next();
};

/**
 * função para saber o saldo
 */
function getBalance(statement) {
    const balance = statement.reduce((acc, operation) =>{
        if(operation.type === 'credit') {
            acc + operation.amount
        }else {
            acc - operation.amount
        }
    }, 0)

    return balance;
};

app.post("/account", (request, response) => {
    /**
     * usando a desestrutuação dizendo para o codigo que você quer pegar o cpf e o name que vem no request body
     */
    const {cpf, name} = request.body;

    /**
     * Validando se já existe um cpf cadastrado igual ao cpf que foi digitado
     */
    const customerAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf
        );

        if(customerAlreadyExists){
            return response.status(400).json({error: "Customer already exsists!"})
        }     

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    })
    return response.status(201).send();
});
/**
 * um middleware que você utilizaria em todas as suas rotas
 */

//app.use(verifyIfExistsAccountCPF)

/**
 * Buscando o extrato bancario do cliente
 * Um middleware que seria usado em rotas especificas
 */
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    /**
     * retornando se o cpf existe ou não
     */
    return response.json(customer.statement);
});

/**
 * Criando o deposito e verificando se a conta na qual vai ser depositado existe
 */
app.post("/deposit",verifyIfExistsAccountCPF, (request, response) =>{
    const { description, amount } = request.body;

    const { customer }  = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();
    
});

/**
 * Criando saque e verificando se a conta na qual o dinheiro vai ser sacado existe e se o saldo for suficiente para o saque
 */
app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
    const { amount } = request.body;
    const { customer } = request;

    const balance = getBalance(customer.statement);

    if(balance < amount) {
        return response.status(400).json({ Error: "Caloteiro!"})
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }
    customer.statement.push(statementOperation)

    return response.status(201).send();
});

/**
 * Buscando o extrato bancario por data e verificando se o cpf que vai ser atualizado é valido
 */
app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const { date } = request.query;
   
    const dateFormat = new Date(date + " 00:00")
    
    /**
     * Filtrando a busca somente pelo dia informado
     */
    const statement = customer.statement.filter(
        (statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString()
        )

    return response.json(statement)
});

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    return response.json(customer);
});

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    customers.splice(customer, 1);

    return response.status(200).json(customers);
});

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
})

app.listen(3333);