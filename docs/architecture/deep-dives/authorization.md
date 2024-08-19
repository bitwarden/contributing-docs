# Authorization

Authorization logic decides whether a user is permitted to carry out an action.

We use
[ASP.NET Core resource-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resourcebased?view=aspnetcore-8.0)
for our server-side authorization logic.

## Defining authorization logic

1. Identify the resource you are working with. This is generally a database entity.

2. Define the different operations a user can perform on this resource:

   ```cs
   public class CipherOperationRequirement : OperationAuthorizationRequirement { }

   public static class CipherOperations
   {
       public static readonly CipherOperationRequirement Create = new() { Name = nameof(Create) };
       public static readonly CipherOperationRequirement Read = new() { Name = nameof(Read) };
       public static readonly CipherOperationRequirement Update = new() { Name = nameof(Update) };
       public static readonly CipherOperationRequirement Delete = new() { Name = nameof(Delete) };
   }

   ```

3. Define an an authorization handler for the operation and resource:

   ```cs
   public class CipherAuthorizationHandler : AuthorizationHandler<CipherOperationRequirement, Cipher>
   {
   }
   ```

4. Implement the `HandleRequirementAsync` method. It should handle all possible requirements, and
   call `context.Succeed` if the user is authorized:

   ```cs
   protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context,
       CipherOperationRequirement requirement, Cipher cipher)
   {
       var authorized = false;

       switch (requirement)
       {
           case not null when requirement == CipherOperations.Create:
               authorized = await CanCreate(cipher);  // this is a private method that contains the authorization check
               break;

           // handle other CipherOperations here
       }

       if (authorized)
       {
           context.Succeed(requirement);
       }
   }
   ```

## Performing authorization checks

To check whether the user has permissions to perform an action:

```cs
var authorizationResult = await _authorizationService.AuthorizeAsync(User, resource, operation);
if (!authorizationService.Succeeded)
{
  throw new NotFoundError();
}
```

We provide an overload method, `AuthorizeOrThrowAsync`, which encapsulates this pattern of throwing
an error if the check fails.

### Create

Instantiate the object you want to save, then pass it to AuthorizationService to determine whether
it can be written to the database.

```cs
var cipher = cipherRequestModel.ToCipher();
await _authorizationService.AuthorizeOrThrowAsync(User, cipher, CipherOperations.Create);

await _cipherRepository.Create(cipher);
```

### Read

Read the object from the database, then pass it to AuthorizationService to determine whether it may
be returned to the user.

```cs
var cipher = _cipherRepository.GetByIdAsync(id);
await _authorizationService.AuthorizeOrThrowAsync(User, cipher, CipherOperations.Read);

return new CipherResponseModel(cipher);
```

### Update

Read the **unedited** object from the database, then pass it to AuthorizationService to determine
whether the user can update it.

```cs
var cipher = _cipherRepository.GetByIdAsync(id);
await _authorizationService.AuthorizeOrThrowAsync(User, cipher, CipherOperations.Update);

// Only update the cipher after the authorization check has passed
cipher.Name = cipherRequest.Name;
await _cipherRepository.UpdateAsync(cipher);
```

:::danger

Do **not** use the request object as the authorization input. It has been provided by the user and
is not a trusted source of authorization.

:::

### Delete

Read the object from the database, then pass it to AuthorizationService to determine whether the
user can delete it.

```cs
var cipher = _cipherRepository.GetByIdAsync(id);
await _authorizationService.AuthorizeOrThrowAsync(User, cipher, CipherOperations.Delete);

await _cipherRepository.DeleteAsync(cipher);
```

### Bulk reads

Some queries return all resources of a type within a particular scope. For example, rather than
returning a specific cipher, return all ciphers for an organization.

In this case, the `CurrentContextOrganization` object (a representation of the organization
constructed from the user's claims) becomes the resource, and the operation describes the scope of
the read. This would require a separate handler to be defined for this combination of resource and
operation.

```cs
var organization = _currentContext.GetOrganization(orgId);
await _authorizationService.AuthorizeOrThrowAsync(User, organization, CipherOperations.ReadAllForOrganization);

var result = await _cipherRepository.ReadManyByOrganizationId(orgId);
```

Sometimes the database query itself is scoped to the UserId, such that no additional authorization
check is required or even possible. If this is not obvious from the context, note this in a comment:

```cs
// Note: this database call only returns the user's ciphers - no authorization check needed
var result = await _cipherRepository.ReadManyByUserId(userId);
```

## Guidelines

### CQRS

Authorization checks (i.e. the call to `IAuthorizationService`) should be contained in
[command and query classes](http://localhost:3000/architecture/server/#cqrs-adr-0008).

### Operation names

Define your basic operations using the CRUD verbs - create, read, update, delete.

### Use 404 errors

If authorization fails, return a 404 Not Found error to the client. This avoids disclosing whether
the resource exists to a user who is not permitted to access it (i.e. neither confirm nor deny).

Do not use 401 Unauthorized.

### Multiple handlers for a resource

If you define multiple handlers for a single resource, they will all be called each time an
authorization check is performed on that resource type.

For the check to pass, at least 1 handler must return a success result, and no handler may return a
fail result.

Multiple handlers are useful when there are multiple sources of user permissions. For example, a
user may be authorized to edit a collection because they are an organization member, a provider
member, or authenticated via the Public API. All could be checked in a single handler, but splitting
logic into separate handlers keeps each one short, simple and easier to test.

### Relational resources

Some operations change the relationship between resources. In this case, the entity that represents
the relational database row is treated as its own resource.

For example, an organization user's group assignment is recorded in the `GroupUser` database table
and is represented as a `GroupUser` object in C#.

```cs
// Adding a user to a group
var groupUser = new GroupUser
{
  GroupId = '123',
  OrganizationUserId = '456'
};

await _authorizationService.AuthorizeOrThrowAsync(User, groupUser, GroupUserOperations.Create);
```

### Performance

Handlers may be called in a loop for multiple resources of the same type. Therefore, handlers should
be cheap to call.

In particular, avoid reading from the database each time a handler is called. If you find yourself
needing to do this, consider:

- using the user's claims (i.e. the JWT)
- using the `IApplicationCacheService` (which caches some organization properties)
- caching the results of the first database read in the handler for subsequent use - note that
  handlers are scoped to the lifetime of the HTTP request
- constructing a composite object (a DTO) as the resource that is passed into the handler, which
  includes the additional data you need

## See also

- [Authorization ADR](../adr/0022-server-authorization.md)
