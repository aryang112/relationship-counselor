import { Prisma } from '@prisma/client';

describe('Prisma schema', () => {
  it('contains Couple, Session, and Interview models', () => {
    expect(Prisma.ModelName.Couple).toBe('Couple');
    expect(Prisma.ModelName.Session).toBe('Session');
    expect(Prisma.ModelName.Interview).toBe('Interview');
  });

  it('exposes relations on the User model', () => {
    const userModel = Prisma.dmmf.datamodel.models.find((model) => model.name === 'User');
    expect(userModel).toBeDefined();
    expect(userModel?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['couplesAsUserA', 'couplesAsUserB', 'interviews']),
    );
  });
});
