# Authorization

Authorization logic decides whether a user is permitted to carry out an action.

We use [ASP.NET Core resource-based authorization][resource-based-auth] for our server-side
authorization logic.

## Defining authorization logic

1. Identify the resource you are working with. This is generally a database entity. Here we are
   using `Cipher` as an example resource.

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

3. Define an an authorization handler for the operation and resource. It must inherit from the
   `AuthorizationHandler` class:

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
               authorized = await CanCreate(context.User, cipher);  // this is a private method that contains the authorization check
               break;

           // handle other CipherOperations here
       }

       if (authorized)
       {
           context.Succeed(requirement);
       }
   }
   ```

5. Register your handler in a service extensions class:

```cs
services.AddScoped<IAuthorizationHandler, CipherAuthorizationHandler>();
```

## Performing authorization checks

To check whether the user has permissions to perform an action:

```cs
var authorizationResult = await _authorizationService.AuthorizeAsync(User, resource, operation);
if (!authorizationResult.Succeeded)
{
  throw new NotFoundException();
}
```

We provide an extension method, `AuthorizeOrThrowAsync`, which encapsulates this pattern of throwing
a `NotFoundError` if the check fails.

### Create

Instantiate the object you want to save, then pass it to `AuthorizationService`.

```cs
var cipher = cipherRequestModel.ToCipher();
await _authorizationService.AuthorizeOrThrowAsync(User, cipher, CipherOperations.Create);

await _cipherRepository.Create(cipher);
```

### Read

Read the object from the database, then pass it to `AuthorizationService`.

```cs
var cipher = _cipherRepository.GetByIdAsync(id);
await _authorizationService.AuthorizeOrThrowAsync(User, cipher, CipherOperations.Read);

return new CipherResponseModel(cipher);
```

### Update

Read the **unedited** object from the database, then pass it to `AuthorizationService`.

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

Read the object from the database, then pass it to `AuthorizationService`.

```cs
var cipher = _cipherRepository.GetByIdAsync(id);
await _authorizationService.AuthorizeOrThrowAsync(User, cipher, CipherOperations.Delete);

await _cipherRepository.DeleteAsync(cipher);
```

### Bulk reads

Some queries return all resources of a type within a particular scope. For example, rather than
returning a specific cipher, return all ciphers for an organization.

In this example, the `CurrentContextOrganization` object (representing the organization) becomes the
resource, and the operation describes the scope of the read. This would require a separate handler
to be defined for this combination of resource and operation.

```cs
var organization = _currentContext.GetOrganization(orgId);
await _authorizationService.AuthorizeOrThrowAsync(User, organization, CipherOperations.ReadAllForOrganization);

var result = await _cipherRepository.ReadManyByOrganizationId(orgId);
```

Sometimes the database query itself is scoped to the user, such that no additional authorization
check is required or even possible. If this is not obvious from the context, note this in a comment:

```cs
// Note: this database call only returns the user's ciphers - no authorization check needed
var result = await _cipherRepository.ReadManyByUserId(userId);
```

## Guidelines

### Where to check authorization

You can check authorization in the controller endpoint or in the query/command class itself. There
are arguments for both and this remains an open topic. However, aim to be clear and consistent in
your approach. The most important thing is that you have authorized all actions being undertaken by
the user.

### Operation names

Define your basic operations using the CRUD verbs - create, read, update, delete. You may add
additional operations if required by your domain.

### Use 404 errors

If authorization fails, return a 404 Not Found error to the client. This avoids disclosing whether
the resource exists to a user who is not permitted to access it, preventing enumeration.

Do not use 401 Unauthorized.

### Do not put validation logic in handlers

Authorization determines whether the user is permitted to carry out the action, not whether the
action itself is valid.

Put validation logic in your command, not in the authorization handler.

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

### Composite objects

Read queries do not always return atomic database entities. If you are returning a view that
combines several different database tables, it should be treated as its own resource with its own
handler.

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

- [Authorization ADR][adr]

[adr]: ../adr/0022-server-authorization.md
[resource-based-auth]:
  https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resourcebased?view=aspnetcore-8.0
