Feature: Delete account

  # Should fail because of known accessibility issues
  @failMobile
  Scenario: Successfully delete account
    Given I go to the journey initiator
    And I begin a "account-delete" journey
    And the page has finished loading    
    Then the page title is prefixed with "You’ll need to delete your GOV.UK One Login"
    And the page looks as expected
    And the page meets our accessibility standards
  
    Given I click the "Start" button
    And the page has finished loading    
    Then the page title is prefixed with "Enter the code sent to your email address"
    And the page contains the text "testuser@test.null.local"
    And the page looks as expected
    And the page meets our accessibility standards
  
    Given I click the "Problems with the code?" element
    Then I click the "send the code again" link
    And the page has finished loading    
    Then the page title is prefixed with "TODO resendEmailVerificationCode"
    And the page looks as expected
    And the page meets our accessibility standards
  
    Given I click the "TODO resend" button
    Then the page title is prefixed with "Enter the code sent to your email address"

    Given I click the "Problems with the code?" element
    Then I click the "send the code again" link
    Then the page title is prefixed with "TODO resendEmailVerificationCode"

    Given I click the "TODO verifyCode" link
    Then the page title is prefixed with "Enter the code sent to your email address"

    Given I enter the correct verification code
    And I click the "Continue" button
    And the page has finished loading    
    Then the page title is prefixed with "Enter your password"
    And the page looks as expected
    And the page meets our accessibility standards
  
    Given I enter my password
    And I click the "Continue" button
    And the page has finished loading    
    Then the page title is prefixed with "Delete your GOV.UK One Login"
    And the page looks as expected
    And the page meets our accessibility standards
  
    Given I click the "Delete your GOV.UK One Login" button
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "account-delete",
    "sub": "urn:fdc:gov.uk:default",
    "success": true
    """
    And the page contains the text:
    """
    "details": {},
    "journey": "account-delete",
    "success": true,
    """