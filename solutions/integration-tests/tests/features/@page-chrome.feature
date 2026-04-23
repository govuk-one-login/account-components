Feature: Page chrome

  Scenario: Signed out page chrome
    Given I go to the journey initiator
    And I select the option beginning with "Auth" in the "Client" select
    And I begin a "testing-journey" journey    
    Then the page looks as expected
    And the header logo links to the GOV.UK homepage
    And the account navigation is not present
    And the sign out button is not present in the header

  Scenario: Signed in page chrome
    Given I go to the journey initiator
    And I select the option beginning with "Home" in the "Client" select
    And I begin a "testing-journey" journey    
    Then the page looks as expected
    And the header logo links to the account management Your Services page  
    And the account navigation is present and contains the expected links
    Given I click the sign out button in the header
    Then the page contains the text "Client callback"
    And the page contains the text '"email": "testuser@test.null.local",'
    And the page contains the text:
    """
    "scope": "testing-journey",
    "sub": "urn:fdc:gov.uk:default",
    "success": false
    """
    And the page contains the text:
    """
    "details": {
      "error": {
        "code": 1001,
        "description": "UserSignedOut"
      }      
    },
    "journey": "testing-journey",
    "success": false,
    """ 

  Scenario: Navigate via app channel
    Given I go to the journey initiator
    And I select the "strategic_app" channel
    Then the footer does not show
    And the phase banner does not show
    And a 'govuk-template__mobile' class is applied to the document
    And the GOVUK logo is not a link
    And the page looks as expected

  Scenario: Navigate via web channel
    Given I go to the journey initiator
    And I select the "web" channel
    Then the footer shows
    And the phase banner shows
    And a 'govuk-template__mobile' class is not applied to the document
    And the GOVUK logo is a link