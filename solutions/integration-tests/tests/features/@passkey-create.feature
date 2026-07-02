# Retries are necessary as the virtual authenticator can be a bit flaky
@retries:3
Feature: Passkey create

  Scenario: Back out of journey (signed out journey)
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    Then the page title is prefixed with "Set up a passkey"

    Given I click the "Back" link
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",
        "details": {
          "error": {
          "code": 1003,
          "description": "UserBackedOutOfJourney"
          }      
        },        
        "success": false
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": false
    }    
    """

  # Should fail because of known accessibility issues
  @failMobile
  Scenario: Abort journey from create screen (signed out journey)
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I click the "Where will my passkey be saved?" element
    Then the page title is prefixed with "Set up a passkey"
    And the page looks as expected
    And the page meets our accessibility standards

    Given I click the "Skip for now" link
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",
        "details": {
          "error": {
          "code": 1002,
          "description": "UserAbortedJourney"
          }      
        },        
        "success": false
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": false
    }    
    """

  # Should fail because of known accessibility issues
  @failMobile
  Scenario: Abort journey from error screen (signed out journey)
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: false
    isUserVerified: false
    hasResidentKey: false
    """    
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey"
    And the page looks as expected
    And the page meets our accessibility standards

    Given I click the "Continue" button
    Then the page title is prefixed with "Error - We could not set up your passkey"
    And the page looks as expected
    And the page meets our accessibility standards
  
    Given I select the option beginning with "Try setting up a passkey again" in the "What would you like to do?" radio button group   
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey"

    Given I select the option beginning with "Skip for now" in the "What would you like to do?" radio button group
    And I click the "Continue" button
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",
        "details": {
          "error": {
          "code": 1002,
          "description": "UserAbortedJourney"
          }      
        },        
        "success": false
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": false
    }    
    """

  # Should fail because of known accessibility issues
  @failMobile
  Scenario: Abort journey from create screen (signed in journey)
    Given I go to the journey initiator
    And I select the option beginning with "Home" in the "Client" select    
    And I begin a "passkey-create" journey
    And I click the "Where will my passkey be saved?" element
    Then the page title is prefixed with "Set up a passkey"
    And the page looks as expected
    And the page meets our accessibility standards

    Given I click the "Cancel and go back" link
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",
        "details": {
          "error": {
          "code": 1002,
          "description": "UserAbortedJourney"
          }      
        },        
        "success": false
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": false
    }    
    """

  # Should fail because of known accessibility issues
  @failMobile
  Scenario: Abort journey from error screen (signed in journey)
    Given I go to the journey initiator
    And I select the option beginning with "Home" in the "Client" select    
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: false
    isUserVerified: false
    hasResidentKey: false
    """    
    And I click the "Set up a passkey" button
    Then the page title is prefixed with "We could not set up your passkey"
    And the page looks as expected
    And the page meets our accessibility standards

    Given I click the "Continue" button
    Then the page title is prefixed with "Error - We could not set up your passkey"
    And the page looks as expected
    And the page meets our accessibility standards
  
    Given I select the option beginning with "Try setting up a passkey again" in the "What would you like to do?" radio button group   
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey"

    Given I select the option beginning with "Cancel and go back" in the "What would you like to do?" radio button group
    And I click the "Continue" button
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",
        "details": {
          "error": {
          "code": 1002,
          "description": "UserAbortedJourney"
          }      
        },        
        "success": false
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": false
    }    
    """  
    
  Scenario: Successfully create a passkey
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    """    
    And I click the "Continue" button
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",      
        "success": true
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": true
    }    
    """
    And the page contains the text '"aaguid": "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"'

  Scenario: User has maximum number of passkeys
    Given I go to the journey initiator
    And I select the option beginning with "Maximum number of passkeys" in the "Get passkeys" select    
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    """    
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey"  

  Scenario: Successfully create a passkey from error screen
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: false
    isUserVerified: false
    hasResidentKey: false
    """    
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey"
    
    Given I have no authenticators
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    """ 
    And I select the option beginning with "Try setting up a passkey again" in the "What would you like to do?" radio button group   
    And I click the "Continue" button
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",      
        "success": true
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": true
    }    
    """
    And the page contains the text '"aaguid": "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"'

  Scenario: Invalid authenticators
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: false
    isUserVerified: false
    hasResidentKey: false
    """    
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey"
    
    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: false
    hasResidentKey: true
    """    
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey" 

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    protocol: u2f
    transport: usb
    """    
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey"

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    protocol: u2f
    transport: ble
    """    
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey" 

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    protocol: u2f
    transport: nfc
    """    
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey"

  Scenario: Valid authenticators
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    """    
    And I click the "Continue" button    
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",      
        "success": true
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": true
    }    
    """
    And the page contains the text '"aaguid": "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"'

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    transport: usb
    """    
    And I click the "Continue" button    
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",      
        "success": true
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": true
    }    
    """
    And the page contains the text '"aaguid": "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"'

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    transport: nfc
    """    
    And I click the "Continue" button    
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",      
        "success": true
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": true
    }    
    """
    And the page contains the text '"aaguid": "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"'

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    transport: ble
    """    
    And I click the "Continue" button    
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",      
        "success": true
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": true
    }    
    """
    And the page contains the text '"aaguid": "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"'

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    defaultBackupEligibility: true
    defaultBackupState: true
    """    
    And I click the "Continue" button    
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",      
        "success": true
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": true
    }    
    """
    And the page contains the text '"aaguid": "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"'

  @noJs
  Scenario: JavaScript disabled
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    hasResidentKey: true
    """    
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey"

    Given I select the option beginning with "Try setting up a passkey again" in the "What would you like to do?" radio button group   
    And I click the "Continue" button
    Then the page title is prefixed with "We could not set up your passkey"    

    Given I select the option beginning with "Skip for now" in the "What would you like to do?" radio button group
    And I click the "Continue" button
    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",
        "details": {
          "error": {
          "code": 1002,
          "description": "UserAbortedJourney"
          }      
        },        
        "success": false
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": false
    }    
    """ 

  Scenario: Interventions on account (Blocked)
    Given I go to the journey initiator
    And I select the option beginning with "Blocked" in the "Get user account intervention status" select
    And I begin a "passkey-create" journey

    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",
        "details": {
          "accountInterventionsStatus": {
            "state": {
              "blocked": true,
              "reproveIdentity": false,
              "resetPassword": false,
              "suspended": false  
            }
          },      
          "error": {
            "code": 1004,
            "description": "AccountHasInterventions"
          }      
        },        
        "success": false
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": false
    }    
    """  

  Scenario: Interventions on account (Suspended, no user actions required)
    Given I go to the journey initiator
    And I select the option beginning with "Suspended, no user actions required" in the "Get user account intervention status" select
    And I begin a "passkey-create" journey

    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",
        "details": {
          "accountInterventionsStatus": {
            "state": {
              "blocked": false,
              "reproveIdentity": false,
              "resetPassword": false,
              "suspended": true  
            }
          },      
          "error": {
            "code": 1004,
            "description": "AccountHasInterventions"
          }      
        },        
        "success": false
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": false
    }    
    """       

  Scenario: Interventions on account (Suspended, reset password required)
    Given I go to the journey initiator
    And I select the option beginning with "Suspended, reset password required" in the "Get user account intervention status" select
    And I begin a "passkey-create" journey

    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",
        "details": {
          "accountInterventionsStatus": {
            "state": {
              "blocked": false,
              "reproveIdentity": false,
              "resetPassword": true,
              "suspended": true  
            }
          },      
          "error": {
            "code": 1004,
            "description": "AccountHasInterventions"
          }      
        },        
        "success": false
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": false
    }    
    """    

  Scenario: Interventions on account (Suspended, reprove identity required)
    Given I go to the journey initiator
    And I select the option beginning with "Suspended, reprove identity required" in the "Get user account intervention status" select
    And I begin a "passkey-create" journey

    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",
        "details": {
          "accountInterventionsStatus": {
            "state": {
              "blocked": false,
              "reproveIdentity": true,
              "resetPassword": false,
              "suspended": true  
            }
          },      
          "error": {
            "code": 1004,
            "description": "AccountHasInterventions"
          }      
        },        
        "success": false
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": false
    }    
    """  

  Scenario: Interventions on account (Suspended, reset password and reprove identity required)
    Given I go to the journey initiator
    And I select the option beginning with "Suspended, reset password and reprove identity required" in the "Get user account intervention status" select
    And I begin a "passkey-create" journey

    Then the page contains the text "Client callback"
    And the journey outcome matches the object:
    """
    {
      "actions": [{
        "action": "passkey-create",
        "details": {
          "accountInterventionsStatus": {
            "state": {
              "blocked": false,
              "reproveIdentity": true,
              "resetPassword": true,
              "suspended": true  
            }
          },      
          "error": {
            "code": 1004,
            "description": "AccountHasInterventions"
          }      
        },        
        "success": false
      }],
      "email": "testuser@test.null.local",
      "scope": "passkey-create",
      "sub": "urn:fdc:gov.uk:default",
      "success": false
    }    
    """