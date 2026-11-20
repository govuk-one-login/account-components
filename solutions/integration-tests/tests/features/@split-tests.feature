Feature: Split tests

  Scenario: Bucket 1
    Given I go to the journey initiator
    And I fill the input with the label beginning with "Split test bucket assignments" with the text:
      """
        testingJourneySplitTest: bucket1
      """
    And I begin a "testing-journey" journey 
    Then the page contains the text "Testing journey step 1 - split test bucket 1"   

  Scenario: Bucket 2
    Given I go to the journey initiator
    And I fill the input with the label beginning with "Split test bucket assignments" with the text:
      """
        testingJourneySplitTest: bucket2
      """
    And I begin a "testing-journey" journey 
    Then the page contains the text "Testing journey step 1 - split test bucket 2"   

  Scenario: Bucket 3
    Given I go to the journey initiator
    And I fill the input with the label beginning with "Split test bucket assignments" with the text:
      """
        testingJourneySplitTest: bucket3
      """
    And I begin a "testing-journey" journey 
    Then the page contains the text "Testing journey step 1 - split test bucket 3"   
