@skipMobile
Feature: Invalid request object

  Scenario: Unknown scope  
    Given I go to the journey initiator
    And I begin a "am-unknown" journey
    Then the page contains the text "Error: invalid_request"
    And the page contains the text "Error description: E2008"

  Scenario: Invalid algorithm  
    Given I go to the journey initiator
    And I select the option beginning with "invalidAlg" in the "scenario" radio button group
    And I begin a "testing-journey" journey    
    Then the page contains the text "Error: invalid_request"
    And the page contains the text "Error description: E2007"

  Scenario: "None" algorithm  
    Given I go to the journey initiator
    And I select the option beginning with "noneAlg" in the "scenario" radio button group
    And I begin a "testing-journey" journey    
    Then the page contains the text "Error: invalid_request"
    And the page contains the text "Error description: E2007"    

  Scenario: Expired  
    Given I go to the journey initiator
    And I select the option beginning with "expired" in the "scenario" radio button group
    And I begin a "testing-journey" journey    
    Then the page contains the text "Error: invalid_request"
    And the page contains the text "Error description: E2007"    

  Scenario: IAT in the future  
    Given I go to the journey initiator
    And I select the option beginning with "iatInFuture" in the "scenario" radio button group
    And I begin a "testing-journey" journey    
    Then the page contains the text "Error: invalid_request"
    And the page contains the text "Error description: E2008" 

  Scenario: Invalid client
    Given I go to the journey initiator
    And I select the option beginning with "Invalid" in the "Client" select
    And I begin a "testing-journey" journey    
    Then the page path is "Authorize error"            

  Scenario: Non-existent user
    Given I go to the journey initiator
    And I select the option beginning with "non_existent" in the "user" radio button group
    And I begin a "testing-journey" journey    
    Then the page contains the text "Error: invalid_request"
    And the page contains the text "Error description: E2008"

  Scenario: Issuer does not match client ID
    Given I go to the journey initiator
    And I fill the input with the label beginning with "Issuer" with the text "invalid issuer"
    And I begin a "testing-journey" journey    
    Then the page contains the text "Error: invalid_request"
    And the page contains the text "Error description: E2008"

  Scenario: Nonce has already been used
    Given I go to the journey initiator
    And I fill the input with the label beginning with "Nonce" with the text "custom_nonce"
    And I begin a "testing-journey" journey    
    Then the page title is prefixed with "Testing journey step 1"
    Given I go to the journey initiator
    And I fill the input with the label beginning with "Nonce" with the text "custom_nonce"
    And I begin a "testing-journey" journey
    Then the page contains the text "Error: invalid_request"
    And the page contains the text "Error description: E2010"    