const prisma = require('../utils/prisma');
const { AppError } = require('../utils/errors');

class CustomerService {
  async getAllCustomers() {
    return await prisma.customer.findMany();
  }

  async getCustomerById(id) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }
    return customer;
  }

  async createCustomer(data) {
    const existing = await prisma.customer.findUnique({
      where: { email: data.email }
    });
    
    if (existing) {
      throw new AppError('Customer with this email already exists', 409, 'DUPLICATE_EMAIL');
    }

    return await prisma.customer.create({ data });
  }

  async updateCustomer(id, data) {
    await this.getCustomerById(id);
    return await prisma.customer.update({
      where: { id },
      data
    });
  }
}

module.exports = new CustomerService();
