// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CertificateRegistry
 * @dev Smart contract for storing and verifying academic certificates on blockchain
 * @author Degree Defenders - Government of Jharkhand
 */
contract CertificateRegistry {
    
    struct Certificate {
        string certificateHash;
        string studentName;
        string course;
        uint256 passingYear;
        address issuer;
        uint256 timestamp;
        bool isActive;
    }
    
    // Mapping from certificate hash to certificate data
    mapping(string => Certificate) public certificates;
    
    // Mapping from issuer address to institution name
    mapping(address => string) public authorizedInstitutions;
    
    // Array to store all certificate hashes for enumeration
    string[] public certificateHashes;
    
    // Events
    event CertificateStored(
        string indexed certificateHash,
        address indexed issuer,
        string studentName,
        string course,
        uint256 passingYear
    );
    
    event InstitutionAuthorized(address indexed institution, string name);
    event InstitutionRevoked(address indexed institution);
    event CertificateRevoked(string indexed certificateHash);
    
    // Contract owner (Government authority)
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can perform this action");
        _;
    }
    
    modifier onlyAuthorizedInstitution() {
        require(
            bytes(authorizedInstitutions[msg.sender]).length > 0,
            "Only authorized institutions can store certificates"
        );
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Authorize an institution to store certificates
     * @param institution Address of the institution
     * @param name Name of the institution
     */
    function authorizeInstitution(address institution, string memory name) 
        external 
        onlyOwner 
    {
        require(institution != address(0), "Invalid institution address");
        require(bytes(name).length > 0, "Institution name cannot be empty");
        
        authorizedInstitutions[institution] = name;
        emit InstitutionAuthorized(institution, name);
    }
    
    /**
     * @dev Revoke authorization of an institution
     * @param institution Address of the institution to revoke
     */
    function revokeInstitution(address institution) 
        external 
        onlyOwner 
    {
        require(
            bytes(authorizedInstitutions[institution]).length > 0,
            "Institution not authorized"
        );
        
        delete authorizedInstitutions[institution];
        emit InstitutionRevoked(institution);
    }
    
    /**
     * @dev Store a certificate on the blockchain
     * @param certificateHash Unique hash of the certificate
     * @param studentName Name of the student
     * @param course Course/degree name
     * @param passingYear Year of completion
     */
    function storeCertificate(
        string memory certificateHash,
        string memory studentName,
        string memory course,
        uint256 passingYear
    ) 
        external 
        onlyAuthorizedInstitution 
        returns (uint256) 
    {
        require(bytes(certificateHash).length > 0, "Certificate hash cannot be empty");
        require(bytes(studentName).length > 0, "Student name cannot be empty");
        require(bytes(course).length > 0, "Course name cannot be empty");
        require(passingYear > 1900 && passingYear <= 2100, "Invalid passing year");
        require(
            bytes(certificates[certificateHash].certificateHash).length == 0,
            "Certificate already exists"
        );
        
        certificates[certificateHash] = Certificate({
            certificateHash: certificateHash,
            studentName: studentName,
            course: course,
            passingYear: passingYear,
            issuer: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });
        
        certificateHashes.push(certificateHash);
        
        emit CertificateStored(
            certificateHash,
            msg.sender,
            studentName,
            course,
            passingYear
        );
        
        return certificateHashes.length - 1;
    }
    
    /**
     * @dev Verify a certificate by its hash
     * @param certificateHash Hash of the certificate to verify
     * @return exists Whether the certificate exists
     * @return studentName Name of the student
     * @return course Course/degree name
     * @return passingYear Year of completion
     * @return timestamp When the certificate was stored
     */
    function verifyCertificate(string memory certificateHash)
        external
        view
        returns (
            bool exists,
            string memory studentName,
            string memory course,
            uint256 passingYear,
            uint256 timestamp
        )
    {
        Certificate memory cert = certificates[certificateHash];
        
        if (bytes(cert.certificateHash).length > 0 && cert.isActive) {
            return (
                true,
                cert.studentName,
                cert.course,
                cert.passingYear,
                cert.timestamp
            );
        }
        
        return (false, "", "", 0, 0);
    }
    
    /**
     * @dev Get certificate details by hash
     * @param certificateHash Hash of the certificate
     * @return Certificate struct
     */
    function getCertificate(string memory certificateHash)
        external
        view
        returns (Certificate memory)
    {
        return certificates[certificateHash];
    }
    
    /**
     * @dev Revoke a certificate (mark as inactive)
     * @param certificateHash Hash of the certificate to revoke
     */
    function revokeCertificate(string memory certificateHash)
        external
    {
        Certificate storage cert = certificates[certificateHash];
        require(bytes(cert.certificateHash).length > 0, "Certificate does not exist");
        require(
            msg.sender == cert.issuer || msg.sender == owner,
            "Only issuer or owner can revoke certificate"
        );
        
        cert.isActive = false;
        emit CertificateRevoked(certificateHash);
    }
    
    /**
     * @dev Get total number of certificates stored
     * @return Total count of certificates
     */
    function getCertificateCount() external view returns (uint256) {
        return certificateHashes.length;
    }
    
    /**
     * @dev Get certificate hash by index
     * @param index Index of the certificate
     * @return Certificate hash at the given index
     */
    function getCertificateHashByIndex(uint256 index)
        external
        view
        returns (string memory)
    {
        require(index < certificateHashes.length, "Index out of bounds");
        return certificateHashes[index];
    }
    
    /**
     * @dev Check if an institution is authorized
     * @param institution Address to check
     * @return Whether the institution is authorized
     */
    function isAuthorizedInstitution(address institution)
        external
        view
        returns (bool)
    {
        return bytes(authorizedInstitutions[institution]).length > 0;
    }
    
    /**
     * @dev Get institution name by address
     * @param institution Address of the institution
     * @return Name of the institution
     */
    function getInstitutionName(address institution)
        external
        view
        returns (string memory)
    {
        return authorizedInstitutions[institution];
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
    
    /**
     * @dev Emergency function to pause contract (future implementation)
     */
    function emergencyPause() external onlyOwner {
        // Implementation for emergency pause functionality
        // This can be expanded based on requirements
    }
}
