Feature: Passkey create

  # Should fail because of known accessibility issues
  @failMobile
  Scenario: Abort journey from create screen (signed out journey)
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And the page has finished loading
    And I click the "Where will my passkey be saved?" element
    Then the page title is prefixed with "Set up a passkey"
    And the page looks as expected
    And the page meets our accessibility standards

    Given I click the "Skip for now" link
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": false
    """
    And the page contains the text:
    """
    "details": {
      "error": {
        "code": 1002,
        "description": "UserAbortedJourney"
      }      
    },
    "journey": "passkey-create",
    "success": false,
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
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "We could not set up your passkey"
    And the page looks as expected
    And the page meets our accessibility standards

    Given I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "Error - We could not set up your passkey"
    And the page looks as expected
    And the page meets our accessibility standards
  
    Given I select the option beginning with "Try setting up a passkey again" in the "What would you like to do?" radio button group   
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "We could not set up your passkey"

    Given I select the option beginning with "Skip for now" in the "What would you like to do?" radio button group
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": false
    """
    And the page contains the text:
    """
    "details": {
      "error": {
        "code": 1002,
        "description": "UserAbortedJourney"
      }      
    },
    "journey": "passkey-create",
    "success": false,
    """

  # Should fail because of known accessibility issues
  @failMobile
  Scenario: Abort journey from create screen (signed in journey)
    Given I go to the journey initiator
    And I select the option beginning with "Home" in the "Client" select    
    And I begin a "passkey-create" journey
    And the page has finished loading
    And I click the "TODO where will my passkey be saved?" element
    Then the page title is prefixed with "TODO create passkey"
    And the page looks as expected
    And the page meets our accessibility standards

    Given I click the "TODO skip" link
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": false
    """
    And the page contains the text:
    """
    "details": {
      "error": {
        "code": 1002,
        "description": "UserAbortedJourney"
      }      
    },
    "journey": "passkey-create",
    "success": false,
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
    """    
    And I click the "TODO create passkey" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "TODO create passkey error"
    And the page looks as expected
    And the page meets our accessibility standards

    Given I click the "TODO submit" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "Error - TODO create passkey error"
    And the page looks as expected
    And the page meets our accessibility standards
  
    Given I select the option beginning with "TODO try again" in the "TODO legendText" radio button group   
    And I click the "TODO submit" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "TODO create passkey error"

    Given I select the option beginning with "TODO skip" in the "TODO legendText" radio button group
    And I click the "TODO submit" button to continue to create passkey journey
    And the page has finished loading
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": false
    """
    And the page contains the text:
    """
    "details": {
      "error": {
        "code": 1002,
        "description": "UserAbortedJourney"
      }      
    },
    "journey": "passkey-create",
    "success": false,
    """    
    
  Scenario: Successfully create a passkey
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": true
    """
    And the page contains the text:
    """
    "details": {},
    "journey": "passkey-create",
    "success": true,
    """

  Scenario: Successfully create a passkey from error screen
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: false
    isUserVerified: false
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "We could not set up your passkey"
    
    Given I have no authenticators
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    """ 
    And I select the option beginning with "Try setting up a passkey again" in the "What would you like to do?" radio button group   
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": true
    """
    And the page contains the text:
    """
    "details": {},
    "journey": "passkey-create",
    "success": true,
    """

  Scenario: Invalid authenticators
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: false
    isUserVerified: false
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "We could not set up your passkey"
    
    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: false
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "We could not set up your passkey" 

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    protocol: u2f
    transport: usb
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "We could not set up your passkey"

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    protocol: u2f
    transport: ble
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "We could not set up your passkey" 

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    protocol: u2f
    transport: nfc
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "We could not set up your passkey"

  Scenario: Valid authenticators
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading    
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": true
    """
    And the page contains the text:
    """
    "details": {},
    "journey": "passkey-create",
    "success": true,
    """

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    transport: usb
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading    
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": true
    """
    And the page contains the text:
    """
    "details": {},
    "journey": "passkey-create",
    "success": true,
    """  

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    transport: nfc
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading    
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": true
    """
    And the page contains the text:
    """
    "details": {},
    "journey": "passkey-create",
    "success": true,
    """    

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    transport: ble
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading    
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": true
    """
    And the page contains the text:
    """
    "details": {},
    "journey": "passkey-create",
    "success": true,
    """

    Given I have no authenticators
    And I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    defaultBackupEligibility: true
    defaultBackupState: true
    hasResidentKey: true
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading    
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": true
    """
    And the page contains the text:
    """
    "details": {},
    "journey": "passkey-create",
    "success": true,
    """       

  @noJs
  Scenario: JavaScript disabled
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    """    
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "We could not set up your passkey"

    Given I select the option beginning with "Try setting up a passkey again" in the "What would you like to do?" radio button group   
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page title is prefixed with "We could not set up your passkey"    

    Given I select the option beginning with "Skip for now" in the "What would you like to do?" radio button group
    And I click the "Continue" button to continue to create passkey journey
    And the page has finished loading
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "passkey-create",
    "sub": "urn:fdc:gov.uk:default",
    "success": false
    """
    And the page contains the text:
    """
    "details": {
      "error": {
        "code": 1002,
        "description": "UserAbortedJourney"
      }      
    },
    "journey": "passkey-create",
    "success": false,
    """    