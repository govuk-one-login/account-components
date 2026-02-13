Feature: Passkey create

  # Should fail because of known accessibility issues
  @failMobile
  Scenario: Successfully create passkey
    Given I go to the journey initiator
    And I begin a "passkey-create" journey
    And the page has finished loading    
    Then the page title is prefixed with "TODO create passkey"
    And the page looks as expected
    And the page meets our accessibility standards
  
    Given I have an authenticator with the following options:
    """
    hasUserVerification: true
    isUserVerified: true
    """    
    And I click the "TODO create passkey" button
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