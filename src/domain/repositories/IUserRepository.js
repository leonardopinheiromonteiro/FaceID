/**
 * IUserRepository Interface (Domain Layer - DIP)
 * Abstract repository contract for user management.
 */
class IUserRepository {
  async findAll() { throw new Error('Method not implemented.'); }
  async findById(id) { throw new Error('Method not implemented.'); }
  async findByName(name) { throw new Error('Method not implemented.'); }
  async findByRegistration(registration) { throw new Error('Method not implemented.'); }
  async save(user) { throw new Error('Method not implemented.'); }
  async delete(id) { throw new Error('Method not implemented.'); }
}

module.exports = IUserRepository;
