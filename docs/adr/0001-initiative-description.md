# Account Components

**Initiative Owner: Home**  
**DRB:**

- [DRB0042](https://govukverify.atlassian.net/wiki/spaces/Architecture/pages/5431263407/DRB042+2025-06-05+-+Account+Management+Components)
- [Presentation](https://docs.google.com/presentation/d/1pN8HN86O1Xg3enxloj9L5g5eFBnnZ2i2JSrsKWg3LlI/edit?slide=id.g2af76eabea2_0_41#slide=id.g2af76eabea2_0_41)

The purpose of the Account Components solution is to make common user journeys reusable instead of having to duplicate them.
For example, the journey to change a password exists in both Home and Auth with their own implementations, therefore content and functionality is duplicated across two codebases and thus requires effort to ensure functional and content parity.
By creating Account Components solution, common journeys shall become reusable and consistent and only reside in this single codebase.

## Why

- Similar journeys replicated across systems
- Services overloaded with functions that could be offloaded into other services
- Limited scalability for future requirements, eg: Multiple intervention mitigations
- Leads to complexities with service maintenance and duplication of features.

## Target Proposal

Create new components for account management features.
The new component has defined boundaries for the tasks it is responsible for.
Features can evolve independently - reduced dependency between teams
Model can scale to support future requirements such as additional interventions
Simplifies the authentication service and helps account services move closer to the Tier 1 model.
![Target Proposal](./images/target_proposal.png "Target Proposal")

- Clients invoke individual components for Account Management through an OAuth call - scoped for the function that the component is expected to perform.
- Each component encapsulates required UI screens and processing logic for the action to be performed (eg: password reset, email update etc)
- Post-auth journeys use the Auth access token issued for the user to invoke account management APIs
- Pre-auth journeys (password/MFA reset) will need to use a generated Orch token to access APIs on behalf of the user
  ![Component Integrations](./images/component_integrations.png "Component Integrations")

### Benefits

- Services have defined boundaries for the tasks they are responsible for
- Features can evolve independently - reduced dependency on teams
- Model can scale to support future requirements such as additional interventions

### Structure

To reduce the maintenance cost, the account management service will form a single service with different modules within it.
![Module Structure](./images/module-structure.png "Module Structure")

- A single OAuth interface will sit over multiple separate journey flows.
- Auth and One Login Home will control journey selection directly (via OAuth claims)
- Orchestration will rely on journey selection to call AIS to select appropriate intervention journeys

## Journey Components

### Account Deletion

Intended to be used by:

- Auth for Single Factor (Self-Serve) Account Deletion
  - Jira
    - [DFDT-150](https://govukverify.atlassian.net/browse/DFDT-150)
    - [DCP-4833](https://govukverify.atlassian.net/browse/DCP-4833)
  - Confluence
    - [DCP-4833](https://govukverify.atlassian.net/wiki/spaces/DID/pages/5420318728/DCP-4833+Self+Service+Account+Deletion)  
      ![Single Factor Account Deletion](./images/single-factor-account-deletion.png "SFAD")
- Home frontend for Deleting OL Account (TODO)

### Future Journeys Components

- #### Password Management
- #### MFA Management
- #### Email Management
- #### Intervention Mitigations
- #### Passkey Management
