Feature: Page chrome

  Scenario: Signed out page chrome
    Given I go to the journey initiator
    And I select the option beginning with "Auth" in the "Client" select
    And I begin a "testing-journey" journey
    And the page has finished loading    
    Then the page looks as expected
    And the header logo links to the GOV.UK homepage
    And the account navigation is not present
    And the sign out button is not present in the header

  Scenario: Signed in page chrome
    Given I go to the journey initiator
    And I select the option beginning with "Home" in the "Client" select
    And I begin a "testing-journey" journey
    And the page has finished loading    
    Then the page looks as expected
    And the header logo links to the account management Your Services page  
    And the account navigation is present and contains the expected links
    Given I click the sign out button in the header
    Then the page contains the text "Error: access_denied"
    And the page contains the text "Error description: E1007"    